/**
 * Einheitliches Ergebnis aller Server Actions. Fehler werden ausdruecklich
 * zurueckgegeben statt geworfen, damit Formulare sie gezielt anzeigen koennen
 * und niemals ein Stacktrace beim Nutzer landet.
 */
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export function ok(): ActionResult;
export function ok<T>(data: T): ActionResult<T>;
export function ok<T>(data?: T): ActionResult<T | undefined> {
  return { ok: true, data };
}

export function fail(
  error: string,
  fieldErrors?: Record<string, string[]>,
): ActionResult<never> {
  return { ok: false, error, fieldErrors };
}

/** Wandelt einen Zod-Fehler in die Feldzuordnung des Formulars um. */
export function fromZod(
  issues: { path: PropertyKey[]; message: string }[],
  message = 'Bitte prüfe deine Eingaben',
): ActionResult<never> {
  const fieldErrors: Record<string, string[]> = {};

  for (const issue of issues) {
    const key = issue.path.map(String).join('.') || '_';
    (fieldErrors[key] ??= []).push(issue.message);
  }

  return fail(message, fieldErrors);
}
