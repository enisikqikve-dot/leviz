import { notifyAdminsOfSignup } from '@/features/admin/signup-notice';
import type { SocialIdentity } from '@/lib/auth/id-token';
import { prisma } from '@/lib/db';
import type { Locale } from '@/lib/i18n/routing';

/**
 * Konto zu einer geprueften Google- oder Apple-Identitaet -- der Kern hinter
 * /api/v1/auth/social.
 *
 * Dieselben Regeln wie bei Auth.js auf der Website, und dieselbe Tabelle
 * (`Account` mit Anbieter und Kennung), damit ein Konto, das auf der Website
 * ueber Google entstand, in der App mit demselben Google-Konto wiedergefunden
 * wird -- und umgekehrt. Apple vergibt die Kennung je Entwicklerkonto, sie
 * ist fuer Website (Services ID) und App (Bundle-ID) dieselbe.
 *
 * Nicht verschmolzen wird auch hier: gibt es die E-Mail schon mit Passwort
 * oder ueber einen anderen Anbieter, kommt `account-exists` zurueck -- die
 * Begruendung steht in lib/auth/config.ts.
 */
export type SocialLoginResult =
  | { ok: true; userId: string; created: boolean }
  | { ok: false; reason: 'account-exists' | 'account-suspended' };

export async function loginWithSocialIdentity(
  identity: SocialIdentity,
  input: { name: string | null; locale: Locale },
): Promise<SocialLoginResult> {
  const account = await prisma.account.findUnique({
    where: {
      provider_providerAccountId: { provider: identity.provider, providerAccountId: identity.subject },
    },
    select: { user: { select: { id: true, status: true } } },
  });

  if (account) {
    if (account.user.status !== 'ACTIVE') return { ok: false, reason: 'account-suspended' };
    return { ok: true, userId: account.user.id, created: false };
  }

  const belegt = await prisma.user.findUnique({
    where: { email: identity.email },
    select: { id: true },
  });
  if (belegt) return { ok: false, reason: 'account-exists' };

  // Wie der Adapter auf der Website: Nutzer, Profil und Anbieterkonto in
  // einem Zug. Apple nennt den Namen nur beim allerersten Mal -- fehlt er,
  // heisst das Konto wie seine Adresse, genau wie bei Auth.js.
  const name = input.name?.trim() || identity.email;
  const user = await prisma.user.create({
    data: {
      name,
      email: identity.email,
      // Google und Apple haben die Adresse bestaetigt; das Passwortkonto
      // kann das von sich nicht sagen.
      emailVerified: identity.emailVerified ? new Date() : null,
      locale: input.locale,
      profile: { create: {} },
      accounts: {
        create: { type: 'oidc', provider: identity.provider, providerAccountId: identity.subject },
      },
    },
    select: { id: true },
  });

  try {
    await notifyAdminsOfSignup({ name, email: identity.email, dealer: null });
  } catch (fehler) {
    console.error('  LEVIZ: Verwaltermeldung fehlgeschlagen —', fehler);
  }

  return { ok: true, userId: user.id, created: true };
}
