'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

import { ok, type ActionResult } from '@/lib/action-result';

import { COMPARE_COOKIE, parseCompare, serializeCompare, toggleCompare } from './store';

const ONE_MONTH = 60 * 60 * 24 * 30;

export type CompareState = { ids: string[]; selected: boolean; full: boolean };

/** Nimmt ein Fahrzeug in den Vergleich auf oder entfernt es. */
export async function toggleCompareAction(
  vehicleId: string,
): Promise<ActionResult<CompareState>> {
  const store = await cookies();
  const current = parseCompare(store.get(COMPARE_COOKIE)?.value);
  const result = toggleCompare(current, vehicleId);

  if (!result.full) {
    store.set(COMPARE_COOKIE, serializeCompare(result.ids), {
      path: '/',
      maxAge: ONE_MONTH,
      sameSite: 'lax',
    });
    revalidatePath('/compare');
  }

  return ok(result);
}

export async function clearCompareAction(): Promise<ActionResult> {
  const store = await cookies();
  store.delete(COMPARE_COOKIE);
  revalidatePath('/compare');
  return ok();
}

