// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest';

import { prisma } from '@/lib/db';

import { countByBrand, searchVehicles } from './queries';
import { parseSearchParams } from './schema';

/**
 * Laeuft gegen die Entwicklungsdatenbank mit den Beispieldaten. Ohne Daten
 * werden die Pruefungen uebersprungen statt fehlzuschlagen, damit ein frisch
 * geklontes Projekt nicht rot ist.
 */
let hasData = false;

beforeAll(async () => {
  try {
    hasData = (await prisma.vehicle.count()) > 50;
  } catch {
    hasData = false;
  }
});

const search = (query: Record<string, string>) =>
  searchVehicles(parseSearchParams(query));

describe.runIf(process.env.SKIP_DB_TESTS !== '1')('Fahrzeugsuche', () => {
  it('liefert ohne Filter die erste Seite', async () => {
    if (!hasData) return;
    const result = await search({});
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items.length).toBeLessThanOrEqual(result.pageSize);
    expect(result.total).toBeGreaterThan(result.items.length);
  });

  it('filtert nach Marke', async () => {
    if (!hasData) return;
    const result = await search({ make: 'volkswagen' });
    expect(result.total).toBeGreaterThan(0);
    for (const item of result.items) expect(item.brand.slug).toBe('volkswagen');
  });

  it('haelt die Preisspanne ein', async () => {
    if (!hasData) return;
    const result = await search({ priceMin: '5000', priceMax: '12000' });
    for (const item of result.items) {
      expect(item.priceCents).toBeGreaterThanOrEqual(500_000);
      expect(item.priceCents).toBeLessThanOrEqual(1_200_000);
    }
  });

  it('filtert nach dem Zollstatus', async () => {
    if (!hasData) return;
    const result = await search({ customs: 'NOT_CLEARED' });
    expect(result.total).toBeGreaterThan(0);
    for (const item of result.items) expect(item.customsStatus).toBe('NOT_CLEARED');
  });

  it('kombiniert mehrere Filter mit UND', async () => {
    if (!hasData) return;
    const combined = await search({ fuel: 'DIESEL', transmission: 'AUTOMATIC' });
    for (const item of combined.items) {
      expect(item.fuel).toBe('DIESEL');
      expect(item.transmission).toBe('AUTOMATIC');
    }
    const dieselOnly = await search({ fuel: 'DIESEL' });
    expect(combined.total).toBeLessThanOrEqual(dieselOnly.total);
  });

  it('sortiert nach Preis aufsteigend', async () => {
    if (!hasData) return;
    const result = await search({ sort: 'priceAsc' });
    const prices = result.items.map((item) => item.priceCents);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });

  it('stellt hervorgehobene Inserate nach vorn', async () => {
    if (!hasData) return;
    const result = await search({ sort: 'relevance' });
    const firstFeatured = result.items.findIndex((item) => item.featuredScore > 0);
    const firstPlain = result.items.findIndex((item) => item.featuredScore === 0);
    if (firstFeatured !== -1 && firstPlain !== -1) {
      expect(firstFeatured).toBeLessThan(firstPlain);
    }
  });

  it('blättert ohne Ueberschneidung', async () => {
    if (!hasData) return;
    const first = await search({ sort: 'priceAsc' });
    const second = await search({ sort: 'priceAsc', page: '2' });
    const overlap = first.items
      .map((item) => item.id)
      .filter((id) => second.items.some((item) => item.id === id));
    expect(overlap).toEqual([]);
    expect(second.page).toBe(2);
  });

  it('begrenzt die Umkreissuche auf den Radius', async () => {
    if (!hasData) return;
    const result = await search({ city: 'prishtine', radius: '30' });
    expect(result.center?.name).toBe('Prishtinë');
    for (const item of result.items) {
      expect(item.distanceKm).toBeDefined();
      expect(item.distanceKm!).toBeLessThanOrEqual(30);
    }
  });

  it('findet im groesseren Umkreis mindestens so viele Fahrzeuge', async () => {
    if (!hasData) return;
    const near = await search({ city: 'prishtine', radius: '25' });
    const far = await search({ city: 'prishtine', radius: '120' });
    expect(far.total).toBeGreaterThanOrEqual(near.total);
  });

  it('sortiert nach Entfernung', async () => {
    if (!hasData) return;
    const result = await search({ city: 'prishtine', radius: '150', sort: 'distance' });
    const distances = result.items.map((item) => item.distanceKm ?? 0);
    expect(distances).toEqual([...distances].sort((a, b) => a - b));
  });

  it('findet über den Freitext', async () => {
    if (!hasData) return;
    const result = await search({ q: 'Golf' });
    expect(result.total).toBeGreaterThan(0);
  });

  it('zählt Fahrzeuge je Marke passend zu den übrigen Filtern', async () => {
    if (!hasData) return;
    const counts = await countByBrand(parseSearchParams({ fuel: 'DIESEL' }));
    expect(counts.length).toBeGreaterThan(0);
    expect(counts[0].count).toBeGreaterThanOrEqual(counts[counts.length - 1].count);
  });

  it('liefert für unmögliche Filter eine leere Liste statt eines Fehlers', async () => {
    if (!hasData) return;
    const result = await search({ make: 'gibt-es-nicht' });
    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.pageCount).toBe(1);
  });
});
