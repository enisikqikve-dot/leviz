'use server';

import { revalidatePath } from 'next/cache';

import { fail, ok, type ActionResult } from '@/lib/action-result';
import { getSessionUser } from '@/lib/auth/guards';

import { isFavorite, setFavorite } from './core';

export type FavoriteResult = { favorited: boolean; requiresLogin?: true };

/**
 * Setzt oder entfernt ein Fahrzeug auf der Merkliste. Ohne Anmeldung wird nicht
 * geworfen, sondern ein Hinweis zurueckgegeben — der Aufrufer schickt den
 * Nutzer dann zur Anmeldung, ohne die Seite zu verlieren.
 */
export async function toggleFavoriteAction(
  vehicleId: string,
): Promise<ActionResult<FavoriteResult>> {
  const user = await getSessionUser();
  if (!user) return ok({ favorited: false, requiresLogin: true });

  // Derselbe Weg wie in der App-API -- siehe features/favorites/core.
  const gemerkt = await isFavorite(user.id, vehicleId);
  const ergebnis = await setFavorite(user.id, vehicleId, !gemerkt);

  if (ergebnis === 'vehicle-missing') return fail('Fahrzeug nicht gefunden');

  revalidatePath('/favorites');
  return ok({ favorited: ergebnis === 'added' });
}
