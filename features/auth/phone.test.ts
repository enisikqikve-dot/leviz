import { describe, expect, it } from 'vitest';

import { formatPhone, normalizePhone } from './phone';

describe('normalizePhone', () => {
  it('ergaenzt bei nationaler Schreibweise die Kosovo-Vorwahl', () => {
    expect(normalizePhone('044123456')).toBe('+38344123456');
    expect(normalizePhone('044 123 456')).toBe('+38344123456');
    expect(normalizePhone('044-123-456')).toBe('+38344123456');
  });

  it('akzeptiert die internationale Schreibweise unveraendert', () => {
    expect(normalizePhone('+38344123456')).toBe('+38344123456');
    expect(normalizePhone('+383 44 123 456')).toBe('+38344123456');
  });

  it('wandelt die 00-Schreibweise um', () => {
    expect(normalizePhone('0038344123456')).toBe('+38344123456');
  });

  it('erkennt albanische Nummern', () => {
    expect(normalizePhone('+355672345678')).toBe('+355672345678');
    expect(normalizePhone('0672345678', 'AL')).toBe('+355672345678');
  });

  it('erkennt nordmazedonische Nummern', () => {
    expect(normalizePhone('+38970123456')).toBe('+38970123456');
  });

  it('entfernt die fuehrende Null nach der Laendervorwahl', () => {
    expect(normalizePhone('+383044123456')).toBe('+38344123456');
  });

  it('weist nicht unterstuetzte Laender ab', () => {
    expect(normalizePhone('+4915112345678')).toBeNull();
    expect(normalizePhone('+12025550123')).toBeNull();
  });

  it('weist unbrauchbare Eingaben ab', () => {
    expect(normalizePhone('')).toBeNull();
    expect(normalizePhone('abc')).toBeNull();
    expect(normalizePhone('044')).toBeNull();
    expect(normalizePhone('+383')).toBeNull();
    expect(normalizePhone('04412345678901')).toBeNull();
  });
});

describe('formatPhone', () => {
  it('gruppiert die Nummer lesbar', () => {
    expect(formatPhone('+38344123456')).toBe('+383 44 123 456');
  });

  it('laesst unbekannte Vorwahlen unangetastet', () => {
    expect(formatPhone('+4915112345678')).toBe('+4915112345678');
  });
});
