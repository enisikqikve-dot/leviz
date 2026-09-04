import { cookies } from 'next/headers';

import { COMPARE_COOKIE, parseCompare } from './store';

/**
 * Aktuelle Vergleichsauswahl, serverseitig gelesen.
 *
 * Bewusst getrennt von `actions.ts`: Was dort steht, veroeffentlicht Next.js
 * als aufrufbaren Endpunkt. Ein reiner Lesezugriff der Serverkomponenten hat
 * dort nichts zu suchen.
 */
export async function getCompareIds(): Promise<string[]> {
  const store = await cookies();
  return parseCompare(store.get(COMPARE_COOKIE)?.value);
}
