import { describe, expect, it } from 'vitest';

import {
  buildVehicleTitle, daysSince, formatMileage, formatPower, kwToHp,
  registrationYear, variantFromTitle,
} from './format';

describe('Fahrzeugformatierung', () => {
  it('rechnet Kilowatt in Pferdestaerken um', () => {
    // 140 kW sind die 190 PS eines BMW 320d.
    expect(kwToHp(140)).toBe(190);
    expect(kwToHp(77)).toBe(105);
    expect(kwToHp(110)).toBe(150);
  });

  it('nutzt je Sprache die richtige Einheit', () => {
    expect(formatPower(140, 'sq')).toContain('kf');
    expect(formatPower(140, 'de')).toContain('PS');
    expect(formatPower(140, 'en')).toContain('hp');
  });

  it('gibt bei fehlender Leistung null zurueck', () => {
    expect(formatPower(null, 'de')).toBeNull();
    expect(formatPower(0, 'de')).toBeNull();
  });

  it('gruppiert den Kilometerstand', () => {
    expect(formatMileage(185000, 'de')).toBe('185.000 km');
    expect(formatMileage(0, 'de')).toBe('0 km');
    expect(formatMileage(null, 'de')).toBeNull();
  });

  it('liest das Zulassungsjahr', () => {
    expect(registrationYear(new Date(2019, 4, 12))).toBe(2019);
    expect(registrationYear(null)).toBeNull();
  });

  it('zaehlt vergangene Tage und wird nie negativ', () => {
    const now = new Date('2026-09-02T12:00:00Z');
    expect(daysSince(new Date('2026-09-02T09:00:00Z'), now)).toBe(0);
    expect(daysSince(new Date('2026-08-30T12:00:00Z'), now)).toBe(3);
    expect(daysSince(new Date('2026-12-01T12:00:00Z'), now)).toBe(0);
  });
});

describe('variantFromTitle', () => {
  it('schneidet Marke und Modell ab', () => {
    expect(variantFromTitle('BMW 5er 520d', 'BMW', '5er')).toBe('520d');
    expect(variantFromTitle('Mercedes-Benz C-Klasse C 220 d', 'Mercedes-Benz', 'C-Klasse'))
      .toBe('C 220 d');
  });

  it('gibt null zurueck, wenn nichts uebrig bleibt', () => {
    expect(variantFromTitle('BMW 5er', 'BMW', '5er')).toBeNull();
  });

  it('laesst einen abweichenden Titel unangetastet', () => {
    expect(variantFromTitle('Sondermodell Edition', 'BMW', '5er')).toBe('Sondermodell Edition');
  });

  it('verwechselt aehnliche Modellnamen nicht', () => {
    expect(variantFromTitle('Audi A6 3.0 TDI', 'Audi', 'A4')).toBe('Audi A6 3.0 TDI');
  });
});

describe('buildVehicleTitle', () => {
  it('setzt Marke, Modell und Motorisierung zusammen', () => {
    expect(buildVehicleTitle('BMW', '5er', '520d')).toBe('BMW 5er 520d');
  });

  it('wiederholt den Baureihennamen nicht', () => {
    // Mercedes traegt die Baureihe schon in der Motorbezeichnung.
    expect(buildVehicleTitle('Mercedes-Benz', 'GLC', 'GLC 220 d 4MATIC'))
      .toBe('Mercedes-Benz GLC 220 d 4MATIC');
    expect(buildVehicleTitle('Mercedes-Benz', 'GLE', 'GLE 350 d 4MATIC'))
      .toBe('Mercedes-Benz GLE 350 d 4MATIC');
  });

  it('kommt ohne Motorisierung aus', () => {
    expect(buildVehicleTitle('Fiat', 'Panda')).toBe('Fiat Panda');
    expect(buildVehicleTitle('Fiat', 'Panda', '  ')).toBe('Fiat Panda');
  });

  it('ist das Gegenstueck zu variantFromTitle', () => {
    const title = buildVehicleTitle('Audi', 'A6', '3.0 TDI');
    expect(variantFromTitle(title, 'Audi', 'A6')).toBe('3.0 TDI');
  });
});
