import { describe, expect, it } from 'vitest';

import { boundingBox, formatDistanceKm, haversineKm } from './distance';

const PRISHTINA = { lat: 42.6629, lng: 21.1655 };
const PRIZREN = { lat: 42.2139, lng: 20.7397 };
const TIRANA = { lat: 41.3275, lng: 19.8187 };

describe('haversineKm', () => {
  it('misst Prishtina nach Prizren mit rund 62 km', () => {
    // Luftlinie laut Kartenmaterial etwa 62 km.
    expect(haversineKm(PRISHTINA, PRIZREN)).toBeGreaterThan(58);
    expect(haversineKm(PRISHTINA, PRIZREN)).toBeLessThan(66);
  });

  it('misst Prishtina nach Tirana mit rund 190 km', () => {
    expect(haversineKm(PRISHTINA, TIRANA)).toBeGreaterThan(180);
    expect(haversineKm(PRISHTINA, TIRANA)).toBeLessThan(200);
  });

  it('gibt fuer denselben Punkt null zurueck', () => {
    expect(haversineKm(PRISHTINA, PRISHTINA)).toBeCloseTo(0, 5);
  });

  it('ist in beide Richtungen gleich', () => {
    expect(haversineKm(PRISHTINA, TIRANA)).toBeCloseTo(haversineKm(TIRANA, PRISHTINA), 6);
  });
});

describe('boundingBox', () => {
  it('umschliesst den Radius vollstaendig', () => {
    const box = boundingBox(PRISHTINA, 50);
    // Ein Punkt genau 50 km noerdlich muss noch im Rechteck liegen.
    const north = { lat: PRISHTINA.lat + 50 / 111.32, lng: PRISHTINA.lng };
    expect(north.lat).toBeLessThanOrEqual(box.maxLat + 1e-9);
  });

  it('enthaelt Prizren im 100-km-Umkreis von Prishtina, aber nicht im 30-km', () => {
    const wide = boundingBox(PRISHTINA, 100);
    const narrow = boundingBox(PRISHTINA, 30);

    const inside = (box: ReturnType<typeof boundingBox>) =>
      PRIZREN.lat >= box.minLat && PRIZREN.lat <= box.maxLat &&
      PRIZREN.lng >= box.minLng && PRIZREN.lng <= box.maxLng;

    expect(inside(wide)).toBe(true);
    expect(inside(narrow)).toBe(false);
  });

  it('waechst mit dem Radius', () => {
    const small = boundingBox(PRISHTINA, 10);
    const large = boundingBox(PRISHTINA, 100);
    expect(large.maxLat - large.minLat).toBeGreaterThan(small.maxLat - small.minLat);
  });
});

describe('formatDistanceKm', () => {
  it('zeigt kurze Entfernungen genauer', () => {
    expect(formatDistanceKm(3.42)).toBe('3.4 km');
    expect(formatDistanceKm(62.7)).toBe('63 km');
  });
});
