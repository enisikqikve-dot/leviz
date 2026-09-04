import { describe, expect, it } from 'vitest';

import { buildVehicleSlug, generatePublicCode, publicCodeFromSlug, slugify } from './slug';

describe('slugify', () => {
  it('schreibt albanische Sonderzeichen um', () => {
    expect(slugify('Prishtinë')).toBe('prishtine');
    expect(slugify('Gjakovë')).toBe('gjakove');
    expect(slugify('Korçë')).toBe('korce');
  });

  it('schreibt deutsche Umlaute aus', () => {
    expect(slugify('München')).toBe('muenchen');
    expect(slugify('Düsseldorf')).toBe('duesseldorf');
    expect(slugify('Zürich')).toBe('zuerich');
  });

  it('behandelt Marken mit Hatschek', () => {
    expect(slugify('Škoda')).toBe('skoda');
    expect(slugify('Citroën')).toBe('citroen');
  });

  it('macht aus Leerzeichen und Punkten Bindestriche', () => {
    expect(slugify('2.0 TDI quattro')).toBe('2-0-tdi-quattro');
    expect(slugify('Range Rover Sport')).toBe('range-rover-sport');
  });

  it('laesst keine Bindestriche am Rand stehen', () => {
    expect(slugify('  Golf  ')).toBe('golf');
    expect(slugify('--A6--')).toBe('a6');
  });
});

describe('generatePublicCode', () => {
  it('hat die gewuenschte Laenge', () => {
    expect(generatePublicCode()).toHaveLength(6);
    expect(generatePublicCode(8)).toHaveLength(8);
  });

  it('vermeidet verwechselbare Zeichen', () => {
    for (let i = 0; i < 200; i += 1) {
      expect(generatePublicCode()).not.toMatch(/[01ilo]/);
    }
  });

  it('erzeugt praktisch nie denselben Code zweimal', () => {
    const codes = new Set(Array.from({ length: 500 }, () => generatePublicCode()));
    expect(codes.size).toBeGreaterThan(495);
  });
});

describe('buildVehicleSlug', () => {
  it('setzt eine sprechende Adresse mit Kurzcode zusammen', () => {
    expect(
      buildVehicleSlug({
        brand: 'BMW', model: '3er', variant: '320d xDrive',
        year: 2021, city: 'Prishtinë', publicCode: 'a7f3k2',
      }),
    ).toBe('bmw-3er-320d-xdrive-2021-prishtine-a7f3k2');
  });

  it('laesst fehlende Angaben einfach weg', () => {
    expect(
      buildVehicleSlug({ brand: 'Fiat', model: '500', publicCode: 'x9m2pq' }),
    ).toBe('fiat-500-x9m2pq');
  });

  it('liest den Kurzcode wieder aus', () => {
    const slug = buildVehicleSlug({
      brand: 'Audi', model: 'A6', year: 2018, city: 'Tiranë', publicCode: 'k4t8vn',
    });
    expect(publicCodeFromSlug(slug)).toBe('k4t8vn');
  });

  it('gibt null zurueck, wenn kein Code enthalten ist', () => {
    expect(publicCodeFromSlug('bmw-3er')).toBeNull();
  });
});
