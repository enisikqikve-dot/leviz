/**
 * Angaben zum Betreiber.
 *
 * Diese Werte sind absichtlich leer. Sie gehören in ein Impressum und in einen
 * Vertrag mit dem Zahlungsdienstleister — erfundene Registernummern oder
 * Anschriften wären dort nicht bloß nutzlos, sondern falsche Angaben über ein
 * Unternehmen. Trag deine echten Daten ein, sonst weist die Impressumsseite
 * sichtbar darauf hin, dass sie unvollständig ist.
 *
 * Die Datei liegt bewusst im Quelltext statt in Umgebungsvariablen: ein
 * Impressum ist öffentlich, kein Geheimnis, und gehört in die Versionierung.
 */
/**
 * Stand der Rechtstexte. Fest eingetragen statt aus dem Systemdatum erzeugt:
 * ein Datum, das sich bei jedem Aufruf ändert, behauptet eine Pflege, die es
 * nicht gab. Nach jeder inhaltlichen Änderung hier heraufsetzen.
 */
export const LEGAL_UPDATED = '2026-09-05';

export type LegalEntity = {
  /** Vollständiger Firmenname laut Registereintrag. */
  name: string;
  /** Rechtsform, z. B. „SH.P.K." oder „Biznes individual". */
  legalForm: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
  /** Registernummer beim ARBK. */
  registrationNumber: string;
  /** Steuernummer / Fiskalnummer. */
  taxNumber: string;
  /** Mehrwertsteuernummer, falls vorhanden. */
  vatNumber: string;
  /** Wer für den Inhalt verantwortlich ist. */
  representative: string;
  email: string;
  phone: string;
};

export const legalEntity: LegalEntity = {
  name: 'Leviz',
  // Amtliche Bezeichnung aus dem ARBK-Register. Sie steht in allen drei
  // Sprachfassungen gleich da — ein Registereintrag wird nicht uebersetzt.
  legalForm: 'Biznes individual',
  street: 'Xhorxh Bush',
  postalCode: '60000',
  city: 'Gjilan',
  country: 'Kosova',
  registrationNumber: '1250013139',
  // Steuernummer und Telefon sind keine Pflichtangaben und bleiben offen.
  taxNumber: '',
  vatNumber: '',
  representative: 'Enis Kqiku',
  email: 'info@levizz.com',
  phone: '',
};

/**
 * Felder, ohne die ein Impressum unbrauchbar ist. Die Mehrwertsteuernummer
 * fehlt bewusst: nicht jedes Unternehmen hat eine.
 */
const REQUIRED: (keyof LegalEntity)[] = [
  'name',
  'legalForm',
  'street',
  'postalCode',
  'city',
  'country',
  'registrationNumber',
  'representative',
  'email',
];

/** Welche Pflichtangaben noch fehlen. Leer heißt: vollständig. */
export function missingLegalFields(entity: LegalEntity = legalEntity): (keyof LegalEntity)[] {
  return REQUIRED.filter((field) => entity[field].trim() === '');
}

export function isLegalEntityComplete(entity: LegalEntity = legalEntity): boolean {
  return missingLegalFields(entity).length === 0;
}
