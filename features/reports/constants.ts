/**
 * Meldegründe.
 *
 * Bewusst in einer eigenen Datei und nicht in `actions.ts`: aus einem Modul
 * mit `'use server'` darf nur exportiert werden, was eine asynchrone Funktion
 * ist. Ein dort exportiertes Array kommt im Browser als Platzhalter an, und
 * `REPORT_REASONS.map` scheitert zur Laufzeit — die Fahrzeugseite antwortete
 * deshalb mit 500.
 */
export const REPORT_REASONS = [
  'FRAUD', 'WRONG_PRICE', 'FAKE_VEHICLE', 'DUPLICATE',
  'OFFENSIVE', 'WRONG_INFO', 'ALREADY_SOLD', 'OTHER',
] as const;

export type ReportReasonValue = (typeof REPORT_REASONS)[number];
