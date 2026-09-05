import { PrismaAdapter } from '@auth/prisma-adapter';
import type { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import GitHub from 'next-auth/providers/github';

import { prisma } from '@/lib/db';
import { verifyPassword } from '@/lib/auth/password';
import { consumePhoneCode } from '@/lib/auth/phone-code';
import { credentialsLoginSchema, phoneLoginSchema } from '@/features/auth/schemas';

/** GitHub erscheint nur, wenn tatsaechlich Zugangsdaten hinterlegt sind. */
const githubConfigured =
  Boolean(process.env.AUTH_GITHUB_ID) && Boolean(process.env.AUTH_GITHUB_SECRET);

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

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            role: true,
            status: true,
            passwordHash: true,
            dealer: { select: { id: true } },
          },
        });

        // Konten ohne Passwort entstehen ueber OAuth. Der Vergleich laeuft
        // trotzdem gegen einen Platzhalter, damit die Antwortzeit nicht
        // verraet, ob es die Adresse gibt.
        if (!user?.passwordHash) {
          await verifyPassword(
            '$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHR2YWx1ZQ$0000000000000000000000000000000000000000000',
            parsed.data.password,
          );
          return null;
        }

        const valid = await verifyPassword(user.passwordHash, parsed.data.password);
        if (!valid) return null;
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
     * GitHub-Konto automatisch mit einem gleichnamigen Passwortkonto
     * verschmelzen. Das setzt voraus, dass die Adresse des Passwortkontos
     * bestaetigt ist — bei LEVIZ ist sie das nicht, die Registrierung
     * verschickt bisher nur eine Willkommensmail. Jemand koennte sich also mit
     * einer fremden Adresse registrieren und bekaeme Zugriff, sobald deren
     * echter Inhaber sich ueber GitHub anmeldet. Stattdessen erklaert die
     * Anmeldeseite den Fall (features/auth/oauth-error.ts).
     */
    ...(githubConfigured ? [GitHub] : []),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Die beiden Credentials-Anbieter pruefen den Sperrstatus selbst. Bei
      // OAuth gibt es keine solche Stelle: ohne diese Pruefung bekaeme ein
      // gesperrtes Konto ueber GitHub ein gueltiges Token und stuende danach
      // vor dem Anmeldeformular, weil die Waechter es wieder abweisen.
      if (account?.type !== 'oauth' || !user?.id) return true;

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
      // Registrierung und Seed legen zu jedem Konto ein Profil an. Bei OAuth
      // erzeugt der Adapter nur den Nutzer selbst; ohne diese Zeilen gaebe es
      // Konten ohne Wohnort und ohne Benachrichtigungseinstellungen.
      if (!user.id) return;

      await prisma.profile.upsert({
        where: { userId: user.id },
        create: { userId: user.id },
        update: {},
      });
    },
  },
  trustHost: true,
} satisfies NextAuthConfig;
