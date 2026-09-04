import { describe, expect, it } from 'vitest';

import {
  estimatePrice,
  MIN_SAMPLE,
  quantile,
  similarity,
  type Comparable,
} from './estimate';

/** Vergleichsangebot in Euro, der Kürze halber. */
const car = (eur: number, year: number | null = 2015, km: number | null = 150_000): Comparable => ({
  priceCents: eur * 100,
  year,
  mileageKm: km,
});

describe('Quantil', () => {
  it('liefert bei einem Wert diesen Wert', () => {
    expect(quantile([500], 0.5)).toBe(500);
  });

  it('trifft den Median einer ungeraden Liste', () => {
    expect(quantile([1, 2, 3, 4, 5], 0.5)).toBe(3);
  });

  it('interpoliert zwischen zwei Werten', () => {
    expect(quantile([0, 100], 0.25)).toBe(25);
  });

  it('bleibt bei leerer Liste bei null', () => {
    expect(quantile([], 0.5)).toBe(0);
  });
});

describe('Ähnlichkeit', () => {
  const target = { year: 2015, mileageKm: 150_000, comparables: [] };

  it('gewichtet das gleiche Fahrzeug am höchsten', () => {
    expect(similarity(target, car(10_000, 2015, 150_000))).toBe(1);
  });

  it('gewichtet ein älteres Fahrzeug niedriger', () => {
    const same = similarity(target, car(10_000, 2015, 150_000));
    const older = similarity(target, car(10_000, 2009, 150_000));
    expect(older).toBeLessThan(same);
  });

  it('gewichtet einen höheren Kilometerstand niedriger', () => {
    const same = similarity(target, car(10_000, 2015, 150_000));
    const driven = similarity(target, car(10_000, 2015, 400_000));
    expect(driven).toBeLessThan(same);
  });

  it('lässt ein Fahrzeug ohne Angaben mitzählen, nur schwächer', () => {
    const weight = similarity(target, car(10_000, null, null));
    expect(weight).toBeGreaterThan(0);
    expect(weight).toBeLessThan(1);
  });
});

describe('Preisschätzung', () => {
  it('verweigert die Auskunft bei zu wenigen Vergleichen', () => {
    const comparables = Array.from({ length: MIN_SAMPLE - 1 }, () => car(10_000));
    expect(estimatePrice({ year: 2015, mileageKm: 150_000, comparables })).toBeNull();
  });

  it('trifft bei gleichen Preisen genau diesen Preis', () => {
    const comparables = Array.from({ length: 8 }, () => car(9_000));
    const result = estimatePrice({ year: 2015, mileageKm: 150_000, comparables })!;

    expect(result.averageCents).toBe(900_000);
    expect(result.lowCents).toBe(900_000);
    expect(result.highCents).toBe(900_000);
  });

  it('hält die Spanne um den Mittelwert', () => {
    const comparables = [
      car(7_000), car(8_000), car(9_000), car(10_000),
      car(11_000), car(12_000), car(13_000), car(14_000),
    ];
    const result = estimatePrice({ year: 2015, mileageKm: 150_000, comparables })!;

    expect(result.lowCents).toBeLessThanOrEqual(result.averageCents);
    expect(result.averageCents).toBeLessThanOrEqual(result.highCents);
    expect(result.sampleSize).toBe(8);
  });

  it('lässt einen Ausreißer die Spanne nicht sprengen', () => {
    const normal = Array.from({ length: 9 }, () => car(10_000));
    const withOutlier = [...normal, car(500_000)];

    const result = estimatePrice({ year: 2015, mileageKm: 150_000, comparables: withOutlier })!;

    // Der Ausreißer liegt außerhalb des 10-bis-90-Prozent-Bereichs.
    expect(result.highCents).toBeLessThan(2_000_000);
  });

  it('zieht den Mittelwert zu den ähnlicheren Fahrzeugen', () => {
    // Vier passende Fahrzeuge zu 10.000, vier deutlich ältere zu 4.000.
    const comparables = [
      car(10_000, 2018, 100_000), car(10_000, 2018, 100_000),
      car(10_000, 2018, 100_000), car(10_000, 2018, 100_000),
      car(4_000, 2004, 320_000), car(4_000, 2004, 320_000),
      car(4_000, 2004, 320_000), car(4_000, 2004, 320_000),
    ];

    const result = estimatePrice({ year: 2018, mileageKm: 100_000, comparables })!;
    const ungewichtet = 700_000;

    expect(result.averageCents).toBeGreaterThan(ungewichtet);
  });

  it('meldet bei enger Streuung und großer Stichprobe hohe Verlässlichkeit', () => {
    const comparables = Array.from({ length: 30 }, () => car(10_000));
    const result = estimatePrice({ year: 2015, mileageKm: 150_000, comparables })!;

    expect(result.confidence).toBeGreaterThan(0.9);
  });

  it('meldet bei weiter Streuung geringe Verlässlichkeit', () => {
    const comparables = [
      car(2_000), car(4_000), car(9_000), car(15_000), car(30_000), car(60_000),
    ];
    const result = estimatePrice({ year: 2015, mileageKm: 150_000, comparables })!;

    expect(result.confidence).toBeLessThan(0.6);
  });

  it('übergeht Angebote ohne Preis', () => {
    const comparables = [...Array.from({ length: 6 }, () => car(10_000)), car(0)];
    const result = estimatePrice({ year: 2015, mileageKm: 150_000, comparables })!;

    expect(result.sampleSize).toBe(6);
  });
});
