import { describe, expect, it } from 'vitest';

import { brandTier, estimatePriceCents } from './pricing';

const base = {
  currentYear: 2026,
  customsStatus: 'CLEARED',
  accidentFree: true,
  serviceHistory: true,
  noise: 0,
} as const;

const euro = (input: Parameters<typeof estimatePriceCents>[0]) =>
  estimatePriceCents(input) / 100;

describe('Preismodell', () => {
  it('trifft die Preisspanne des regionalen Marktes', () => {
    // Ein VW Golf 2.0 TDI von 2014 mit 190.000 km kostet im Kosovo
    // erfahrungsgemaess 5.000 bis 9.000 Euro.
    const golf = euro({
      ...base, brandSlug: 'volkswagen', bodyType: 'HATCHBACK',
      fuel: 'DIESEL', year: 2014, mileageKm: 190000,
    });
    expect(golf).toBeGreaterThan(5000);
    expect(golf).toBeLessThan(9000);
  });

  it('bewertet ein juengeres Fahrzeug hoeher', () => {
    const older = euro({ ...base, brandSlug: 'volkswagen', bodyType: 'HATCHBACK', fuel: 'DIESEL', year: 2014, mileageKm: 150000 });
    const newer = euro({ ...base, brandSlug: 'volkswagen', bodyType: 'HATCHBACK', fuel: 'DIESEL', year: 2020, mileageKm: 150000 });
    expect(newer).toBeGreaterThan(older);
  });

  it('bewertet hoehere Laufleistung niedriger', () => {
    const low = euro({ ...base, brandSlug: 'audi', bodyType: 'SEDAN', fuel: 'DIESEL', year: 2017, mileageKm: 90000 });
    const high = euro({ ...base, brandSlug: 'audi', bodyType: 'SEDAN', fuel: 'DIESEL', year: 2017, mileageKm: 280000 });
    expect(high).toBeLessThan(low);
  });

  it('macht unverzollte Fahrzeuge deutlich guenstiger', () => {
    const cleared = euro({ ...base, brandSlug: 'mercedes-benz', bodyType: 'SEDAN', fuel: 'DIESEL', year: 2015, mileageKm: 200000 });
    const notCleared = euro({ ...base, customsStatus: 'NOT_CLEARED', brandSlug: 'mercedes-benz', bodyType: 'SEDAN', fuel: 'DIESEL', year: 2015, mileageKm: 200000 });
    expect(notCleared).toBeLessThan(cleared * 0.8);
  });

  it('zieht Unfallschaden vom Preis ab', () => {
    const clean = euro({ ...base, brandSlug: 'bmw', bodyType: 'SUV', fuel: 'DIESEL', year: 2016, mileageKm: 180000 });
    const damaged = euro({ ...base, accidentFree: false, brandSlug: 'bmw', bodyType: 'SUV', fuel: 'DIESEL', year: 2016, mileageKm: 180000 });
    expect(damaged).toBeLessThan(clean);
  });

  it('haelt auch alte Fahrzeuge ueber der Untergrenze', () => {
    const veryOld = euro({ ...base, brandSlug: 'fiat', bodyType: 'HATCHBACK', fuel: 'PETROL', year: 2003, mileageKm: 380000 });
    expect(veryOld).toBeGreaterThanOrEqual(700);
  });

  it('rundet auf volle 50 Euro, wie Verkaeufer es tun', () => {
    for (const year of [2010, 2015, 2019, 2023]) {
      const value = euro({ ...base, brandSlug: 'skoda', bodyType: 'ESTATE', fuel: 'DIESEL', year, mileageKm: 140000 });
      expect(value % 50).toBe(0);
    }
  });

  it('ordnet Marken der richtigen Klasse zu', () => {
    expect(brandTier('dacia')).toBe('budget');
    expect(brandTier('volkswagen')).toBe('mainstream');
    expect(brandTier('bmw')).toBe('premium');
    expect(brandTier('porsche')).toBe('luxury');
    // Tesla gehoert nicht in dieselbe Klasse wie ein Range Rover.
    expect(brandTier('tesla')).toBe('premium');
  });
});
