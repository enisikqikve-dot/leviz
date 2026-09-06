import { describe, expect, it } from 'vitest';

import { purgeCutoff } from './purge';
import {
  DOCUMENT_RETENTION_DAYS,
  REQUIRED_DOCUMENTS,
  reviewSchema,
  verificationSchema,
} from './schemas';

const PERSON = {
  kind: 'PERSON' as const,
  legalName: 'Arben Krasniqi',
  addressLine: 'Rruga B 12',
  postalCode: '10000',
  city: 'Prishtinë',
  companyName: '',
  registrationNumber: '',
};

describe('verificationSchema', () => {
  it('nimmt den Antrag einer Person ohne Firmenangaben an', () => {
    const ergebnis = verificationSchema.safeParse(PERSON);

    expect(ergebnis.success).toBe(true);
    expect(ergebnis.success && ergebnis.data.companyName).toBeNull();
  });

  it('verlangt vom Haendler Firma und Betriebsnummer', () => {
    const ergebnis = verificationSchema.safeParse({ ...PERSON, kind: 'DEALER' });

    expect(ergebnis.success).toBe(false);
    expect(ergebnis.error?.issues.map((issue) => issue.path.join('.')).sort()).toEqual([
      'companyName',
      'registrationNumber',
    ]);
  });

  it('nimmt einen vollstaendigen Haendlerantrag an', () => {
    const ergebnis = verificationSchema.safeParse({
      ...PERSON,
      kind: 'DEALER',
      companyName: 'Auto Dardania SH.P.K.',
      registrationNumber: '811234567',
    });

    expect(ergebnis.success).toBe(true);
  });

  it('vertraegt seine eigene Ausgabe', () => {
    // Das Formular prueft im Browser und schickt das Ergebnis an den Server,
    // wo dasselbe Schema erneut greift. Aus leeren Feldern ist dann `null`
    // geworden -- ohne `nullish` faellt das Schema hier ueber sich selbst.
    const erste = verificationSchema.parse(PERSON);
    const zweite = verificationSchema.safeParse(erste);

    expect(zweite.success).toBe(true);
    expect(zweite.success && zweite.data).toEqual(erste);
  });

  it('kuerzt Leerraum weg, statt ihn als Namen zu nehmen', () => {
    const ergebnis = verificationSchema.safeParse({ ...PERSON, legalName: '   ' });

    expect(ergebnis.success).toBe(false);
  });
});

describe('reviewSchema', () => {
  it('nimmt eine Zusage ohne Begruendung an', () => {
    expect(reviewSchema.safeParse({ id: 'a1', decision: 'VERIFIED' }).success).toBe(true);
  });

  it('verlangt bei einer Ablehnung eine Begruendung', () => {
    const ergebnis = reviewSchema.safeParse({ id: 'a1', decision: 'REJECTED', note: '  ' });

    expect(ergebnis.success).toBe(false);
    expect(ergebnis.error?.issues[0]?.message).toBe('errorReasonRequired');
  });

  it('nimmt eine begruendete Ablehnung an', () => {
    const ergebnis = reviewSchema.safeParse({
      id: 'a1',
      decision: 'REJECTED',
      note: 'Ausweis unleserlich',
    });

    expect(ergebnis.success).toBe(true);
  });
});

describe('REQUIRED_DOCUMENTS', () => {
  it('verlangt vom Haendler mehr als von einer Person', () => {
    expect(REQUIRED_DOCUMENTS.PERSON).toEqual(['ID_FRONT', 'ID_BACK']);
    expect(REQUIRED_DOCUMENTS.DEALER).toContain('BUSINESS_REGISTRATION');
    expect(REQUIRED_DOCUMENTS.DEALER).toContain('ADDRESS_PROOF');
  });
});

describe('purgeCutoff', () => {
  it('liegt genau die Aufbewahrungsfrist zurueck', () => {
    const jetzt = new Date('2026-09-06T12:00:00.000Z');

    expect(purgeCutoff(jetzt).toISOString()).toBe('2026-06-08T12:00:00.000Z');
    expect(DOCUMENT_RETENTION_DAYS).toBe(90);
  });

  it('haelt einen gerade entschiedenen Antrag noch nicht fuer faellig', () => {
    const jetzt = new Date('2026-09-06T12:00:00.000Z');

    expect(purgeCutoff(jetzt).getTime()).toBeLessThan(jetzt.getTime());
  });
});
