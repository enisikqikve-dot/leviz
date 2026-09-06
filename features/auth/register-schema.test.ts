import { describe, expect, it } from 'vitest';

import { registerSchema } from './schemas';

const BASIS = {
  name: 'Arben Krasniqi',
  email: 'arben@example.com',
  password: 'Leviz2026',
  confirmPassword: 'Leviz2026',
  acceptTerms: true as const,
};

const fehlerfelder = (ergebnis: { error?: { issues: { path: PropertyKey[] }[] } }) =>
  (ergebnis.error?.issues ?? []).map((issue) => issue.path.join('.')).sort();

describe('registerSchema', () => {
  it('legt ohne Angabe ein Privatkonto an', () => {
    const ergebnis = registerSchema.safeParse(BASIS);

    expect(ergebnis.success).toBe(true);
    expect(ergebnis.success && ergebnis.data.accountType).toBe('PRIVATE');
  });

  it('laesst Firmenangaben beim Privatkonto weg', () => {
    const ergebnis = registerSchema.safeParse({
      ...BASIS,
      accountType: 'PRIVATE',
      companyName: '',
      registrationNumber: '',
    });

    expect(ergebnis.success).toBe(true);
    expect(ergebnis.success && ergebnis.data.companyName).toBeNull();
  });

  it('verlangt vom Haendlerkonto Firma und Betriebsnummer', () => {
    const ergebnis = registerSchema.safeParse({ ...BASIS, accountType: 'DEALER' });

    expect(ergebnis.success).toBe(false);
    expect(fehlerfelder(ergebnis)).toEqual(['companyName', 'registrationNumber']);
  });

  it('nimmt ein vollstaendiges Haendlerkonto an', () => {
    const ergebnis = registerSchema.safeParse({
      ...BASIS,
      accountType: 'DEALER',
      companyName: 'Auto Dardania SH.P.K.',
      registrationNumber: '811234567',
    });

    expect(ergebnis.success).toBe(true);
    expect(ergebnis.success && ergebnis.data.companyName).toBe('Auto Dardania SH.P.K.');
  });

  it('haelt an den bisherigen Regeln fest', () => {
    expect(
      registerSchema.safeParse({ ...BASIS, confirmPassword: 'anders123' }).success,
    ).toBe(false);
    expect(registerSchema.safeParse({ ...BASIS, acceptTerms: false }).success).toBe(false);
    expect(registerSchema.safeParse({ ...BASIS, name: 'A' }).success).toBe(false);
  });

  it('vertraegt seine eigene Ausgabe', () => {
    // Das Formular prueft im Browser und schickt das Ergebnis an den Server,
    // wo dasselbe Schema erneut greift. Aus leeren Feldern ist dann `null`
    // geworden -- ohne `nullish` fiele das Schema ueber sich selbst.
    const erste = registerSchema.parse({ ...BASIS, companyName: '', registrationNumber: '' });
    const zweite = registerSchema.safeParse(erste);

    expect(zweite.success).toBe(true);
    expect(zweite.success && zweite.data).toEqual(erste);
  });
});
