import { fail, fromZod, ok, type ActionResult } from '@/lib/action-result';
import { prisma } from '@/lib/db';

import { profileSchema } from './schemas';

/**
 * Das eigene Profil aendern -- ein Weg fuer Website und App.
 *
 * Die Kennung kommt vom Aufrufer (Cookie oder Token) und niemals aus der
 * Eingabe; sonst liesse sich mit einer fremden Kennung ein fremdes Profil
 * ueberschreiben. Fehler sind Uebersetzungsschluessel aus dem Namensraum
 * `account`, keine fertigen Saetze: uebersetzt wird dort, wo angezeigt wird.
 */
export async function updateProfile(userId: string, input: unknown): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error.issues);

  const { name, phone, citySlug, locale } = parsed.data;

  // Eine unbekannte Stadt wird verworfen statt gespeichert: die Kennung kommt
  // vom Geraet und ist damit frei waehlbar. findFirst statt findUnique, weil
  // der Slug erst zusammen mit dem Land eindeutig ist.
  const city = citySlug
    ? await prisma.city.findFirst({ where: { slug: citySlug }, select: { id: true } })
    : null;

  try {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { name, phone, locale },
      }),
      prisma.profile.upsert({
        where: { userId },
        create: { userId, cityId: city?.id ?? null },
        update: { cityId: city?.id ?? null },
      }),
    ]);
  } catch (error) {
    // Die Telefonnummer ist eindeutig. Gehoert sie schon zu einem anderen
    // Konto, ist das kein Serverfehler, sondern eine Eingabe zum Korrigieren.
    if (isUniqueViolation(error, 'phone')) {
      return fail('errorPhoneTaken', { phone: ['errorPhoneTaken'] });
    }
    throw error;
  }

  return ok();
}

/** Erkennt den Prisma-Fehler für eine verletzte Eindeutigkeit auf einem Feld. */
export function isUniqueViolation(error: unknown, field: string): boolean {
  const candidate = error as { code?: string; meta?: { target?: unknown } };
  if (candidate?.code !== 'P2002') return false;

  const target = candidate.meta?.target;
  if (Array.isArray(target)) return target.includes(field);
  return typeof target === 'string' && target.includes(field);
}
