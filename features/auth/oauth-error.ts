/**
 * Auth.js meldet einen fehlgeschlagenen Anmeldeversuch nur als Code in der
 * Adresszeile: /hyr?error=OAuthAccountNotLinked. Ohne Uebersetzung steht der
 * Nutzer wieder vor dem leeren Formular und erfaehrt nicht, woran es lag —
 * beim haeufigsten Fall waere die Erklaerung sogar die Loesung.
 */

/** Fehlercodes, fuer die es eine eigene Erklaerung gibt. */
const SPECIFIC = {
  /**
   * Die E-Mail-Adresse des GitHub-Kontos gehoert bereits zu einem Konto mit
   * Passwort. LEVIZ verknuepft die beiden absichtlich nicht von selbst —
   * siehe die Begruendung in lib/auth/config.ts.
   */
  OAuthAccountNotLinked: 'errorAccountExists',

  /** Abbruch auf der GitHub-Seite oder gesperrtes Konto. */
  AccessDenied: 'errorAccessDenied',
} as const;

export type AuthErrorKey =
  | (typeof SPECIFIC)[keyof typeof SPECIFIC]
  | 'errorGeneric';

/**
 * Ordnet einen Fehlercode einem Uebersetzungsschluessel im Namensraum `auth`
 * zu. Unbekannte Codes bekommen bewusst eine allgemeine Meldung: die
 * englischen Codes von Auth.js sagen einem Verkaeufer in Prishtina nichts.
 */
export function authErrorKey(code: string | undefined | null): AuthErrorKey | null {
  if (!code) return null;
  return SPECIFIC[code as keyof typeof SPECIFIC] ?? 'errorGeneric';
}
