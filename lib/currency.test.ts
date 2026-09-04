import { describe, expect, it } from 'vitest';

import {
  convertFromEurCents, formatDecimal, formatMileage, formatNumber,
  formatPrice, groupDigits, isCurrency,
} from './currency';

describe('groupDigits', () => {
  it('gruppiert in Dreierbloecke', () => {
    expect(groupDigits(5500, '.')).toBe('5.500');
    expect(groupDigits(29990, '.')).toBe('29.990');
    expect(groupDigits(137500, '.')).toBe('137.500');
    expect(groupDigits(1234567, ',')).toBe('1,234,567');
  });

  it('laesst kleine Zahlen unangetastet', () => {
    expect(groupDigits(0, '.')).toBe('0');
    expect(groupDigits(999, '.')).toBe('999');
  });

  it('behaelt das Vorzeichen', () => {
    expect(groupDigits(-5500, '.')).toBe('-5.500');
  });
});

describe('convertFromEurCents', () => {
  it('gibt Euro-Cent unveraendert als Euro-Betrag zurueck', () => {
    expect(convertFromEurCents(2999000, 'EUR')).toBe(29990);
  });

  it('rechnet in Lek um und rundet auf volle 100', () => {
    expect(convertFromEurCents(1000000, 'ALL', 100)).toBe(1000000);
  });

  it('rundet krumme Lek-Betraege auf den naechsten Hunderter', () => {
    expect(convertFromEurCents(123400, 'ALL', 100.5)).toBe(124000);
  });

  it('laesst den Kurs die Umrechnung steuern', () => {
    expect(convertFromEurCents(500000, 'ALL', 100))
      .toBeGreaterThan(convertFromEurCents(500000, 'ALL', 90));
  });
});

describe('formatPrice', () => {
  it('gruppiert auch vierstellige Betraege', () => {
    // Intl liefert fuer sq und de bei 5500 keine Gruppierung; auf einem
    // Marktplatz muss der Preis aber immer gleich aussehen.
    expect(formatPrice(550000, { locale: 'sq' })).toBe('5.500 €');
    expect(formatPrice(550000, { locale: 'de' })).toBe('5.500 €');
    expect(formatPrice(550000, { locale: 'en' })).toBe('€5,500');
  });

  it('stellt das Symbol je Sprache richtig', () => {
    expect(formatPrice(2999000, { locale: 'sq' })).toBe('29.990 €');
    expect(formatPrice(2999000, { locale: 'de' })).toBe('29.990 €');
    expect(formatPrice(2999000, { locale: 'en' })).toBe('€29,990');
  });

  it('zeigt keine Nachkommastellen', () => {
    expect(formatPrice(2999050, { locale: 'de' })).not.toContain(',');
  });

  it('formatiert Lek als Lek, nicht als Euro', () => {
    const result = formatPrice(1000000, { currency: 'ALL', locale: 'sq', eurToAll: 100 });
    expect(result).not.toContain('€');
    expect(result).toContain('L');
    expect(result).toBe('1.000.000 L');
  });

  it('liefert in jeder Sprache dieselbe Zifferngruppierung', () => {
    const digits = (value: string) => value.replace(/[^\d]/g, '');
    const sq = formatPrice(2999000, { locale: 'sq' });
    const en = formatPrice(2999000, { locale: 'en' });
    expect(digits(sq)).toBe(digits(en));
  });
});

describe('formatNumber und formatMileage', () => {
  it('gruppiert den Kilometerstand', () => {
    expect(formatMileage(185000, 'de')).toBe('185.000 km');
    expect(formatMileage(185000, 'en')).toBe('185,000 km');
    expect(formatNumber(9500, 'sq')).toBe('9.500');
  });
});

describe('formatDecimal', () => {
  it('nutzt das Dezimalzeichen der Sprache', () => {
    expect(formatDecimal(6.4, 'de')).toBe('6,4');
    expect(formatDecimal(6.4, 'sq')).toBe('6,4');
    expect(formatDecimal(6.4, 'en')).toBe('6.4');
  });

  it('gruppiert auch vor dem Komma', () => {
    expect(formatDecimal(1234.5, 'de')).toBe('1.234,5');
  });
});

describe('isCurrency', () => {
  it('erkennt gueltige Waehrungen', () => {
    expect(isCurrency('EUR')).toBe(true);
    expect(isCurrency('ALL')).toBe(true);
  });

  it('weist alles andere ab', () => {
    expect(isCurrency('USD')).toBe(false);
    expect(isCurrency('')).toBe(false);
    expect(isCurrency(undefined)).toBe(false);
    expect(isCurrency(42)).toBe(false);
  });
});
