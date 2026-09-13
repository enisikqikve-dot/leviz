'use server';

import { revalidatePath } from 'next/cache';

import type { ActionResult } from '@/lib/action-result';
import { requireUser } from '@/lib/auth/guards';

import {
  deleteListing, markListingSold, publishListing, saveListing,
  toggleListingPause, type PublishResult, type SaveResult,
} from './core';

/**
 * Die Server Actions des Inserat-Assistenten.
 *
 * Hier passiert nichts Fachliches mehr: Wer handelt, kommt aus dem Cookie,
 * die Arbeit macht `core.ts` -- dieselbe, die auch die API fuer die App
 * aufruft. Danach wird die Liste "Meine Inserate" frisch gerechnet.
 */

/** Legt ein Inserat an oder aktualisiert es. */
export async function saveListingAction(
  input: unknown,
  vehicleId?: string,
): Promise<ActionResult<SaveResult>> {
  const user = await requireUser();
  const result = await saveListing(user, input, vehicleId);
  if (result.ok) revalidatePath('/dashboard/listings');
  return result;
}

/** Schaltet ein Inserat live -- oder in die Pruefung, wenn etwas auffiel. */
export async function publishListingAction(
  vehicleId: string,
): Promise<ActionResult<PublishResult>> {
  const user = await requireUser();
  const result = await publishListing(user, vehicleId);
  if (result.ok) revalidatePath('/dashboard/listings');
  return result;
}

/** Pausiert ein Inserat oder schaltet es wieder frei. */
export async function toggleListingPauseAction(
  vehicleId: string,
): Promise<ActionResult<{ status: 'ACTIVE' | 'PAUSED' }>> {
  const user = await requireUser();
  const result = await toggleListingPause(user, vehicleId);
  if (result.ok) revalidatePath('/dashboard/listings');
  return result;
}

/** Markiert ein Fahrzeug als verkauft. */
export async function markListingSoldAction(vehicleId: string): Promise<ActionResult> {
  const user = await requireUser();
  const result = await markListingSold(user, vehicleId);
  if (result.ok) revalidatePath('/dashboard/listings');
  return result;
}

/** Löscht ein Inserat endgültig, samt hochgeladener Bilder. */
export async function deleteListingAction(vehicleId: string): Promise<ActionResult> {
  const user = await requireUser();
  const result = await deleteListing(user, vehicleId);
  if (result.ok) revalidatePath('/dashboard/listings');
  return result;
}
