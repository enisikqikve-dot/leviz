'use server';

import { createHash, randomBytes } from 'node:crypto';

import { getLocale } from 'next-intl/server';

// slugify ist allgemein und liegt nur zufaellig bei den Fahrzeugen.
import { slugify } from '@/features/vehicles/slug';
import { fail, fromZod, ok, type ActionResult } from '@/lib/action-result';
import { hashPassword } from '@/lib/auth/password';
import { issuePhoneCode } from '@/lib/auth/phone-code';
import { prisma } from '@/lib/db';
import { EMAIL_FROM, sendEmail } from '@/lib/email';
import { passwordResetEmail, welcomeEmail } from '@/lib/email/templates';
import type { Locale } from '@/lib/i18n/routing';
import { RATE_LIMITS, rateLimiter } from '@/lib/rate-limit';
import { getRequestIp } from '@/lib/request-ip';
import { siteConfig } from '@/lib/site';
import { sendSms } from '@/lib/sms';

import {
  forgotPasswordSchema,
  phoneCodeRequestSchema,
  registerSchema,
  resetPasswordSchema,
} from './schemas';

const RESET_TTL_MS = 60 * 60_000;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

async function limited(
  bucket: keyof typeof RATE_LIMITS,
  key: string,
): Promise<boolean> {
  const { limit, windowMs } = RATE_LIMITS[bucket];
  const result = await rateLimiter.check(`${bucket}:${key}`, limit, windowMs);
  return !result.success;
}

// ---------------------------------------------------------------------------

/**
 * Ein freier Pfad fuer das Haendlerprofil.
 *
 * Zwei Autohaeuser koennen denselben Namen tragen -- "Auto Center" gibt es in
 * jeder Stadt einmal. Der Pfad steht in der Adresse des Profils und muss
 * eindeutig bleiben, sonst scheitert die Registrierung an einem
 * Datenbankfehler, den der Anmelder nicht versteht.
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

export async function registerAction(
  input: unknown,
): Promise<ActionResult<{ email: string }>> {
  const ip = await getRequestIp();
  if (await limited('register', ip)) {
    return fail('Zu viele Versuche. Bitte versuche es später erneut.');
  }

  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error.issues);

  const { accountType, name, email, password, companyName, registrationNumber } = parsed.data;

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existing) {
    return fail('Diese E-Mail-Adresse ist bereits registriert', {
      email: ['Diese E-Mail-Adresse ist bereits registriert'],
    });
  }

  const locale = (await getLocale()) as Locale;
  const passwordHash = await hashPassword(password);

  const istHaendler = accountType === 'DEALER' && companyName !== null;

  await prisma.user.create({
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
  });

  const template = welcomeEmail(locale, name);
  await sendEmail({
    to: email,
    subject: template.subject,
    text: template.text,
    replyTo: EMAIL_FROM,
  });

  return ok({ email });
}

// ---------------------------------------------------------------------------

export async function requestPasswordResetAction(
  input: unknown,
): Promise<ActionResult> {
  const ip = await getRequestIp();
  if (await limited('passwordReset', ip)) {
    return fail('Zu viele Versuche. Bitte versuche es später erneut.');
  }

  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error.issues);

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, locale: true },
  });

  // Die Antwort ist immer dieselbe. Sonst liesse sich hierueber herausfinden,
  // welche Adressen registriert sind.
  if (!user) return ok();

  const token = randomBytes(32).toString('base64url');

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + RESET_TTL_MS),
    },
  });

  const locale = (user.locale as Locale) ?? 'sq';
  const prefix = locale === 'sq' ? '' : `/${locale}`;
  const path =
    locale === 'sq'
      ? '/rivendos-fjalekalimin'
      : locale === 'de'
        ? '/passwort-zuruecksetzen'
        : '/reset-password';

  const template = passwordResetEmail(
    locale,
    `${siteConfig.url}${prefix}${path}?token=${token}`,
  );

  await sendEmail({
    to: parsed.data.email,
    subject: template.subject,
    text: template.text,
  });

  return ok();
}

// ---------------------------------------------------------------------------

export async function resetPasswordAction(input: unknown): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error.issues);

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(parsed.data.token) },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return fail('Dieser Link ist ungültig oder abgelaufen');
  }

  const passwordHash = await hashPassword(parsed.data.password);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    // Alle weiteren offenen Links desselben Kontos entwerten.
    prisma.passwordResetToken.updateMany({
      where: { userId: record.userId, usedAt: null },
      data: { usedAt: new Date() },
    }),
    prisma.session.deleteMany({ where: { userId: record.userId } }),
  ]);

  return ok();
}

// ---------------------------------------------------------------------------

export async function requestPhoneCodeAction(
  input: unknown,
): Promise<ActionResult<{ phone: string }>> {
  const ip = await getRequestIp();
  if (await limited('phoneCode', ip)) {
    return fail('Zu viele Versuche. Bitte versuche es später erneut.');
  }

  const parsed = phoneCodeRequestSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error.issues);

  const { phone } = parsed.data;

  // Zusaetzlich pro Nummer begrenzen, nicht nur pro Absenderadresse.
  if (await limited('phoneCode', phone)) {
    return fail('Zu viele Codes für diese Nummer. Bitte warte einen Moment.');
  }

  const code = await issuePhoneCode(phone);

  await sendSms({
    to: phone,
    text: `LEVIZ: kodi yt është ${code}. Vlen 10 minuta.`,
  });

  return ok({ phone });
}
