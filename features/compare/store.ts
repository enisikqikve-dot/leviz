export const COMPARE_COOKIE = 'leviz.compare';
export const MAX_COMPARE = 4;

/**
 * Die Vergleichsauswahl liegt in einem Cookie, nicht im Browserspeicher.
 *
 * Grund: Die Vergleichsseite wird auf dem Server gerendert und braucht die
 * Auswahl schon beim ersten Rendern. Aus localStorage käme sie erst nach der
 * Hydration — die Seite würde sichtbar leer starten.
 */
export function parseCompare(value: string | undefined): string[] {
  if (!value) return [];

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => /^[a-z0-9]{1,40}$/i.test(entry))
    .slice(0, MAX_COMPARE);
}

export function serializeCompare(ids: string[]): string {
  return [...new Set(ids)].slice(0, MAX_COMPARE).join(',');
}

export type ToggleResult = {
  ids: string[];
  /** Wahr, wenn das Fahrzeug jetzt in der Auswahl ist. */
  selected: boolean;
  /** Wahr, wenn die Auswahl bereits voll war und nichts geändert wurde. */
  full: boolean;
};

export function toggleCompare(current: string[], vehicleId: string): ToggleResult {
  if (current.includes(vehicleId)) {
    return {
      ids: current.filter((entry) => entry !== vehicleId),
      selected: false,
      full: false,
    };
  }

  if (current.length >= MAX_COMPARE) {
    return { ids: current, selected: false, full: true };
  }

  return { ids: [...current, vehicleId], selected: true, full: false };
}
