'use server';

import { revalidatePath } from 'next/cache';

import type { ActionResult } from '@/lib/action-result';
import { requireUser } from '@/lib/auth/guards';

import { deleteSavedSearch, markSearchSeen, saveSearch } from './core';

/**
 * Die Server Actions der Suchauftraege -- Huellen um `core.ts`, das auch die
 * API der App aufruft.
 */

/** Speichert die aktuellen Filter als Suchauftrag. */
export async function saveSearchAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const result = await saveSearch(user.id, input);
  if (result.ok) revalidatePath('/searches');
  return result;
}

export async function deleteSavedSearchAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const result = await deleteSavedSearch(user.id, id);
  if (result.ok) revalidatePath('/searches');
  return result;
}

/** Markiert die Treffer eines Suchauftrags als gesehen. */
export async function markSearchSeenAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const result = await markSearchSeen(user.id, id);
  if (result.ok) revalidatePath('/searches');
  return result;
}
