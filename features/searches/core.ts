import { z } from 'zod';

import { countActiveFilters, searchSchema } from '@/features/search/schema';
import { fail, fromZod, ok, type ActionResult } from '@/lib/action-result';
import { prisma } from '@/lib/db';

/**
 * Suchauftraege -- ein Weg fuer Website und App.
 *
 * Abgelegt wird genau die Adresszeile, mit der auch gesucht wurde. Damit
 * laesst sich der Auftrag jederzeit wieder oeffnen und fuer die
 * Trefferpruefung dieselbe Abfrage verwenden -- es gibt keine zweite
 * Darstellung der Filter, die auseinanderlaufen koennte.
 */
export const MAX_SAVED_SEARCHES = 25;

export const saveSearchSchema = z.object({
  name: z.string().trim().min(2, 'Emri është shumë i shkurtër').max(80),
  query: z.record(z.string(), z.string()),
  notifyByEmail: z.boolean().default(true),
});

export async function saveSearch(userId: string, input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = saveSearchSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error.issues);

  const { name, query, notifyByEmail } = parsed.data;

  // Ein Suchauftrag ohne Filter würde bei jedem neuen Fahrzeug auslösen.
  const filters = searchSchema.parse(query);
  if (countActiveFilters(filters) === 0) {
    return fail('Setze mindestens einen Filter, bevor du speicherst');
  }

  const count = await prisma.savedSearch.count({ where: { userId } });
  if (count >= MAX_SAVED_SEARCHES) {
    return fail(`Höchstens ${MAX_SAVED_SEARCHES} Suchaufträge`);
  }

  const created = await prisma.savedSearch.create({
    data: { userId, name, query, notifyByEmail, lastCheckedAt: new Date() },
    select: { id: true },
  });

  return ok({ id: created.id });
}

export async function deleteSavedSearch(userId: string, id: string): Promise<ActionResult> {
  const search = await prisma.savedSearch.findUnique({ where: { id }, select: { userId: true } });

  if (!search) return fail('Ky kërkim nuk u gjet');
  if (search.userId !== userId) return fail('Nuk keni qasje në këtë kërkim');

  await prisma.savedSearch.delete({ where: { id } });
  return ok();
}

/** Markiert die Treffer eines Suchauftrags als gesehen. */
export async function markSearchSeen(userId: string, id: string): Promise<ActionResult> {
  const updated = await prisma.savedSearch.updateMany({
    where: { id, userId },
    data: { lastCheckedAt: new Date() },
  });

  if (updated.count === 0) return fail('Ky kërkim nuk u gjet');
  return ok();
}
