'use server';

import { revalidatePath } from 'next/cache';

import { fail, fromZod, ok, type ActionResult } from '@/lib/action-result';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { requireUser } from '@/lib/auth/guards';
import { prisma } from '@/lib/db';
import { RATE_LIMITS, rateLimiter } from '@/lib/rate-limit';

import {
  changePasswordSchema,
  notificationsSchema,
  profileSchema,
} from './schemas';

/**
 * Alle Aktionen dieser Datei ändern ausschließlich das eigene Konto. Die
 * Kennung kommt deshalb aus `requireUser` und niemals aus der Eingabe — sonst
 * ließe sich mit einer fremden Kennung ein fremdes Profil überschreiben.
 *
 * Fehler werden als Übersetzungsschlüssel aus dem Namensraum `account`
 * zurückgegeben, nicht als fertige Sätze. Der Server kennt die Anzeigesprache
 * nicht zuverlässig; sonst stünde eine deutsche Meldung auf einer albanischen
 * Seite.
 */

export async function updateProfileAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error.issues);

  const { name, phone, citySlug, locale } = parsed.data;

  // Eine unbekannte Stadt wird verworfen statt gespeichert: die Kennung kommt
  // aus dem Browser und ist damit frei wählbar. findFirst statt findUnique,
  // weil der Slug erst zusammen mit dem Land eindeutig ist.
  const city = citySlug
    ? await prisma.city.findFirst({ where: { slug: citySlug }, select: { id: true } })
    : null;

  try {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { name, phone, locale },
      }),
      prisma.profile.upsert({
        where: { userId: user.id },
        create: { userId: user.id, cityId: city?.id ?? null },
        update: { cityId: city?.id ?? null },
      }),
    ]);
  } catch (error) {
    // Die Telefonnummer ist eindeutig. Gehört sie schon zu einem anderen
    // Konto, ist das kein Serverfehler, sondern eine Eingabe zum Korrigieren.
    if (isUniqueViolation(error, 'phone')) {
      return fail('errorPhoneTaken', { phone: ['errorPhoneTaken'] });
    }
    throw error;
  }

  revalidatePath('/dashboard/settings');
  revalidatePath('/dashboard');
  return ok();
}

export async function updateNotificationsAction(
  input: unknown,
): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = notificationsSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error.issues);

  await prisma.profile.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...parsed.data },
    update: parsed.data,
  });

  revalidatePath('/dashboard/settings');
  return ok();
}

export async function changePasswordAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();

  // Begrenzt nach Konto, nicht nach Adresse: gebremst werden soll, wer an
  // einem offenen Browser das alte Passwort durchprobiert.
  const { limit, windowMs } = RATE_LIMITS.passwordChange;
  const attempt = await rateLimiter.check(`passwordChange:${user.id}`, limit, windowMs);
  if (!attempt.success) {
    return fail('errorTooManyAttempts');
  }

  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error.issues);

  const account = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });

  // Konten aus GitHub oder Telefonanmeldung haben nie ein Passwort gesetzt.
  if (!account?.passwordHash) {
    return fail('errorNoPassword');
  }

  const valid = await verifyPassword(account.passwordHash, parsed.data.currentPassword);
  if (!valid) {
    return fail('errorCurrentPassword', {
      currentPassword: ['errorCurrentPassword'],
    });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(parsed.data.password) },
  });

  // Hinweis: Sitzungen liegen als JWT im Cookie und lassen sich nicht
  // zurückrufen. Ein bereits angemeldetes Gerät bleibt deshalb bis zum Ablauf
  // des Tokens angemeldet, auch nach einer Passwortänderung.
  return ok();
}

/**
 * Erkennt den Prisma-Fehler für eine verletzte Eindeutigkeit auf einem Feld.
 * Nicht exportiert: eine 'use server'-Datei darf ausschließlich asynchrone
 * Funktionen nach außen geben, alles andere käme im Browser als Platzhalter an.
 */
function isUniqueViolation(error: unknown, field: string): boolean {
  const candidate = error as { code?: string; meta?: { target?: unknown } };
  if (candidate?.code !== 'P2002') return false;

  const target = candidate.meta?.target;
  if (Array.isArray(target)) return target.includes(field);
  return typeof target === 'string' && target.includes(field);
}
