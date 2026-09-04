import type { SearchParams } from './schema';
import { toQueryString } from './schema';

/**
 * Baut eine neue Suchadresse aus den aktuellen Filtern plus Aenderungen.
 * Jede Aenderung setzt die Seitenzahl zurueck, ausser die Seitenzahl selbst
 * wird geaendert — sonst landet man beim Filtern auf einer leeren Seite.
 */
export function mergeSearchParams(
  current: SearchParams,
  changes: Partial<SearchParams>,
): Record<string, string> {
  const merged: Partial<SearchParams> = { ...current, ...changes };

  if (!('page' in changes)) delete merged.page;
  if (merged.page === 1) delete merged.page;

  // Ein leerer Wert bedeutet: Filter entfernen.
  for (const [key, value] of Object.entries(changes)) {
    if (value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
      delete merged[key as keyof SearchParams];
    }
  }

  // Ein Modell ohne Marke ergibt keinen Sinn.
  if (!merged.make) delete merged.model;

  return toQueryString(merged);
}

/** Entfernt genau einen Filter, etwa beim Klick auf ein Filter-Etikett. */
export function removeFilter(
  current: SearchParams,
  key: keyof SearchParams,
  value?: string,
): Record<string, string> {
  const currentValue = current[key];

  if (Array.isArray(currentValue) && value !== undefined) {
    const next = currentValue.filter((entry) => entry !== value);
    return mergeSearchParams(current, { [key]: next } as Partial<SearchParams>);
  }

  return mergeSearchParams(current, { [key]: undefined } as Partial<SearchParams>);
}

/** Setzt alles zurueck bis auf die Sortierung. */
export function clearFilters(current: SearchParams): Record<string, string> {
  return toQueryString(current.sort ? { sort: current.sort } : {});
}
