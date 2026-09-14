import { PrismaAdapter } from '@auth/prisma-adapter';
import type { NextAuthConfig } from 'next-auth';
import Apple from 'next-auth/providers/apple';
import Credentials from 'next-auth/providers/credentials';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';

import { prisma } from '@/lib/db';
import { authenticateWithPassword } from '@/lib/auth/password-login';
import { consumePhoneCode } from '@/lib/auth/phone-code';
import { configuredSocialProviders, type SocialProvider } from '@/lib/auth/social';
import { notifyAdminsOfSignup } from '@/features/admin/signup-notice';
import { credentialsLoginSchema, phoneLoginSchema } from '@/features/auth/schemas';

/**
 * Die fremden Anbieter lesen ihre Zugangswerte selbst aus AUTH_<NAME>_ID und
 * AUTH_<NAME>_SECRET. Angeboten wird nur, was vollstaendig eingerichtet ist --
 * dieselbe Liste, die auch die Knoepfe auf Anmelde- und Registrierseite zeigt.
 *
 * Apple verlangt statt eines festen Geheimnisses ein selbst signiertes JWT,
 * das nach sechs Monaten ablaeuft: `npm run auth:apple-secret`.
 */
const SOCIAL = { google: Google, apple: Apple, github: GitHub } satisfies Record<SocialProvider, unknown>;

export const authConfig = {
  adapter: PrismaAdapter(prisma),
  // Credentials-Anbieter setzen JWT voraus; Sitzungen liegen daher im Cookie.
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    Credentials({
      id: 'password',
      name: 'E-Mail',
      credentials: {
        email: { label: 'E-Mail', type: 'email' },
        password: { label: 'Passwort', type: 'password' },
      },
      async authorize(raw) {
        const parsed = credentialsLoginSchema.safeParse(raw);
        if (!parsed.success) return null;

        // Dieselbe Pruefung wie in der App-API -- siehe lib/auth/password-login.
        return authenticateWithPassword(parsed.data.email, parsed.data.password);
      },
    }),

    Credentials({
      id: 'phone',
      name: 'Telefon',
      credentials: {
        phone: { label: 'Telefon', type: 'tel' },
        code: { label: 'Code', type: 'text' },
      },
      async authorize(raw) {
        const parsed = phoneLoginSchema.safeParse(raw);
        if (!parsed.success) return null;

        const accepted = await consumePhoneCode(parsed.data.phone, parsed.data.code);
        if (!accepted) return null;

        // Eine bestaetigte Nummer legt beim ersten Mal ein Konto an.
        //
        // Offen: die Verwaltung erfaehrt davon noch nichts. Ueber das Formular
        // und ueber die fremden Anbieter wird gemeldet, hier nicht -- `upsert` sagt nicht,
        // ob es angelegt oder gefunden hat. Der Weg ist derzeit ohnehin zu,
        // weil kein SMS-Anbieter eingerichtet ist; wer einen anschliesst,
        // muss diese Stelle mitnehmen.
        const user = await prisma.user.upsert({
          where: { phone: parsed.data.phone },
          update: { phoneVerified: new Date() },
          create: {
            phone: parsed.data.phone,
            phoneVerified: new Date(),
            role: 'USER',
          },
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            role: true,
            status: true,
            dealer: { select: { id: true } },
          },
        });

        if (user.status !== 'ACTIVE') return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          status: user.status,
          dealerId: user.dealer?.id ?? null,
        };
      },
    }),

    /**
     * Bewusst ohne `allowDangerousEmailAccountLinking`: die Option wuerde ein
     * Google-, Apple- oder GitHub-Konto automatisch mit einem gleichnamigen
     * Passwortkonto verschmelzen. Das setzt voraus, dass die Adresse des
     * Passwortkontos bestaetigt ist — bei LEVIZ ist sie das nicht, die
     * Registrierung verschickt bisher nur eine Willkommensmail. Jemand
     * koennte sich also mit einer fremden Adresse registrieren und bekaeme
     * Zugriff, sobald deren echter Inhaber sich ueber Google anmeldet.
     * Stattdessen erklaert die Anmeldeseite den Fall
     * (features/auth/oauth-error.ts).
     */
    ...configuredSocialProviders().map((provider) => SOCIAL[provider]),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Die beiden Credentials-Anbieter pruefen den Sperrstatus selbst. Bei
      // den fremden Anbietern gibt es keine solche Stelle: ohne diese Pruefung
      // bekaeme ein gesperrtes Konto ueber Google ein gueltiges Token und
      // stuende danach vor dem Anmeldeformular, weil die Waechter es wieder
      // abweisen. Google und Apple sind bei Auth.js `oidc`, GitHub `oauth` --
      // wer hier nur auf `oauth` prueft, laesst zwei von dreien durch.
      if (!account || account.type === 'credentials' || !user?.id) return true;

      const record = await prisma.user.findUnique({
        where: { id: user.id },
        select: { status: true },
      });

      // Kein Datensatz heisst: das Konto entsteht gerade erst.
      return !record || record.status === 'ACTIVE';
    },

    async jwt({ token, user, trigger }) {
      if (user?.id) {
        token.id = user.id;
        token.role = user.role ?? 'USER';
        token.status = user.status ?? 'ACTIVE';
        token.dealerId = user.dealerId ?? null;
        return token;
      }

      // Rolle und Sperrstatus koennen sich waehrend einer Sitzung aendern,
      // darum bei jedem ausdruecklichen Aktualisieren neu laden.
      if (trigger === 'update' && token.id) {
        const fresh = await prisma.user.findUnique({
          where: { id: token.id },
          select: { role: true, status: true, dealer: { select: { id: true } } },
        });
        if (fresh) {
          token.role = fresh.role;
          token.status = fresh.status;
          token.dealerId = fresh.dealer?.id ?? null;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (token.id) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.status = token.status;
        session.user.dealerId = token.dealerId;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      // Registrierung und Seed legen zu jedem Konto ein Profil an. Bei den
      // fremden Anbietern erzeugt der Adapter nur den Nutzer selbst; ohne
      // diese Zeilen gaebe es Konten ohne Wohnort und ohne
      // Benachrichtigungseinstellungen.
      if (!user.id) return;

      await prisma.profile.upsert({
        where: { userId: user.id },
        create: { userId: user.id },
        update: {},
      });

      // Dieses Ereignis feuert nur, wenn der Adapter das Konto anlegt -- also
      // bei Google, Apple und GitHub. Die Registrierung ueber das Formular
      // meldet sich selbst; sie geht an diesem Weg vorbei, deshalb entsteht
      // keine doppelte Meldung.
      await notifyAdminsOfSignup({
        name: user.name ?? user.email ?? '—',
        email: user.email ?? '—',
        dealer: null,
      }).catch((fehler) => {
        console.error('  LEVIZ: Verwaltermeldung fehlgeschlagen —', fehler);
      });
    },
  },
  trustHost: true,
} satisfies NextAuthConfig;
