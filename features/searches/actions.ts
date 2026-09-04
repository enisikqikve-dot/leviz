'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { countActiveFilters, searchSchema } from '@/features/search/schema';
import { fail, fromZod, ok, type ActionResult } from '@/lib/action-result';
import { requireUser } from '@/lib/auth/guards';
import { prisma } from '@/lib/db';

const MAX_SAVED_SEARCHES = 25;

const saveSchema = z.object({
  name: z.string().trim().min(2, 'Emri është shumë i shkurtër').max(80),
  query: z.record(z.string(), z.string()),
  notifyByEmail: z.boolean().default(true),
});

/**
 * Speichert die aktuellen Filter als Suchauftrag.
 *
 * Abgelegt wird genau die Adresszeile, mit der auch gesucht wurde. Damit lässt
 * sich der Auftrag jederzeit wieder öffnen und für die Trefferprüfung dieselbe
 * Abfrage verwenden — es gibt keine zweite Darstellung der Filter, die
 * auseinanderlaufen könnte.
 */
export async function saveSearchAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();

  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error.issues);

  const { name, query, notifyByEmail } = parsed.data;

  // Ein Suchauftrag ohne Filter würde bei jedem neuen Fahrzeug auslösen.
  const filters = searchSchema.parse(query);
  if (countActiveFilters(filters) === 0) {
    return fail('Setze mindestens einen Filter, bevor du speicherst');
  }

  const count = await prisma.savedSearch.count({ where: { userId: user.id } });
  if (count >= MAX_SAVED_SEARCHES) {
    return fail(`Höchstens ${MAX_SAVED_SEARCHES} Suchaufträge`);
  }

  const created = await prisma.savedSearch.create({
    data: {
      userId: user.id,
      name,
      query,
      notifyByEmail,
      lastCheckedAt: new Date(),
    },
    select: { id: true },
  });

  revalidatePath('/searches');
  return ok({ id: created.id });
}

export async function deleteSavedSearchAction(id: string): Promise<ActionResult> {
  const user = await requireUser();

  const search = await prisma.savedSearch.findUnique({
    where: { id },
    select: { userId: true },
  });

  if (!search) return fail('Ky kërkim nuk u gjet');
  if (search.userId !== user.id) return fail('Nuk keni qasje në këtë kërkim');

  await prisma.savedSearch.delete({ where: { id } });

  revalidatePath('/searches');
  return ok();
}

/** Markiert die Treffer eines Suchauftrags als gesehen. */
export async function markSearchSeenAction(id: string): Promise<ActionResult> {
  const user = await requireUser();

  const updated = await prisma.savedSearch.updateMany({
    where: { id, userId: user.id },
    data: { lastCheckedAt: new Date() },
  });

  if (updated.count === 0) return fail('Ky kërkim nuk u gjet');

  revalidatePath('/searches');
  return ok();
}
