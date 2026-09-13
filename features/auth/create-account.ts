import { notifyAdminsOfSignup } from '@/features/admin/signup-notice';
import { slugify } from '@/features/vehicles/slug';
import { hashPassword } from '@/lib/auth/password';
import { prisma } from '@/lib/db';
import { EMAIL_FROM, sendEmail } from '@/lib/email';
import { welcomeEmail } from '@/lib/email/templates';
import type { Locale } from '@/lib/i18n/routing';

import type { RegisterInput } from './schemas';

/**
 * Legt ein Konto an -- der eine Weg fuer Registrierformular und App-API.
 *
 * Alles, was nach dem Anlegen geschieht (Willkommensmail, Meldung an die
 * Verwaltung), ist abgesichert: das Konto steht bereits, und ein stummes
 * Postfach darf die Registrierung nicht scheitern lassen. Sonst haette
 * jemand ein Konto, wuesste es nicht und legte ein zweites an.
 */

/**
 * Ein freier Pfad fuer das Haendlerprofil.
 *
 * Zwei "Auto Gashi" duerfen sich registrieren, aber nur einer bekommt
 * /shitesi/auto-gashi -- der zweite wird zu auto-gashi-2.
 */
async function freierHaendlerpfad(companyName: string): Promise<string> {
  const basis = slugify(companyName).slice(0, 60) || 'autosallon';

  for (let versuch = 0; versuch < 20; versuch += 1) {
    const kandidat = versuch === 0 ? basis : `${basis}-${versuch + 1}`;
    const belegt = await prisma.dealer.findUnique({
      where: { slug: kandidat },
      select: { id: true },
    });
    if (!belegt) return kandidat;
  }

  // Nach zwanzig gleichnamigen Haeusern entscheidet der Zufall.
  return `${basis}-${Date.now().toString(36)}`;
}

export type CreateAccountResult =
  | { ok: true; userId: string }
  | { ok: false; reason: 'email-taken' };

export async function createAccount(
  input: RegisterInput,
  locale: Locale,
): Promise<CreateAccountResult> {
  const { accountType, name, email, password, companyName, registrationNumber } = input;

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing) return { ok: false, reason: 'email-taken' };

  const passwordHash = await hashPassword(password);
  const istHaendler = accountType === 'DEALER' && companyName !== null;

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      locale,
      // Wer sich registriert, will meist auch verkaufen koennen.
      role: istHaendler ? 'DEALER' : 'PRIVATE_SELLER',
      profile: { create: {} },
      ...(istHaendler
        ? {
            dealer: {
              create: {
                companyName,
                registrationNumber,
                // Ungeprueft: das Abzeichen kommt erst nach der
                // Ausweispruefung. Inserieren darf er trotzdem sofort.
                slug: await freierHaendlerpfad(companyName),
              },
            },
          }
        : {}),
    },
    select: { id: true },
  });

  const template = welcomeEmail(locale, name);

  try {
    await sendEmail({
      to: email,
      subject: template.subject,
      text: template.text,
      replyTo: EMAIL_FROM,
    });
  } catch (fehler) {
    console.error('  LEVIZ: Willkommensmail nicht zustellbar —', fehler);
  }

  try {
    await notifyAdminsOfSignup({ name, email, dealer: istHaendler ? companyName : null });
  } catch (fehler) {
    console.error('  LEVIZ: Verwaltermeldung fehlgeschlagen —', fehler);
  }

  return { ok: true, userId: user.id };
}
