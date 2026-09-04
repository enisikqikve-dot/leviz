import { describe, expect, it } from 'vitest';

import { mergeSearchParams, clearFilters, removeFilter } from './url';
import { parseSearchParams } from './schema';

const base = parseSearchParams({ make: 'bmw', fuel: 'DIESEL,PETROL', sort: 'priceAsc', page: '4' });

describe('Suchadressen', () => {
  it('setzt beim Filtern die Seitenzahl zurueck', () => {
    const next = mergeSearchParams(base, { make: 'audi' });
    expect(next.page).toBeUndefined();
    expect(next.make).toBe('audi');
  });

  it('behaelt die Seitenzahl, wenn nur geblaettert wird', () => {
    expect(mergeSearchParams(base, { page: 6 }).page).toBe('6');
  });

  it('laesst Seite 1 aus der Adresse weg', () => {
    expect(mergeSearchParams(base, { page: 1 }).page).toBeUndefined();
  });

  it('entfernt einen einzelnen Wert aus einer Mehrfachauswahl', () => {
    expect(removeFilter(base, 'fuel', 'DIESEL').fuel).toBe('PETROL');
  });

  it('entfernt einen ganzen Filter', () => {
    expect(removeFilter(base, 'make').make).toBeUndefined();
  });

  it('verwirft das Modell, wenn die Marke wegfaellt', () => {
    const withModel = parseSearchParams({ make: 'bmw', model: '3er' });
    expect(mergeSearchParams(withModel, { make: undefined }).model).toBeUndefined();
  });

  it('behaelt beim Zuruecksetzen nur die Sortierung', () => {
    const cleared = clearFilters(base);
    expect(cleared).toEqual({ sort: 'priceAsc' });
  });

  it('behaelt bestehende Filter beim Sortieren', () => {
    const next = mergeSearchParams(base, { sort: 'newest' });
    expect(next.make).toBe('bmw');
    expect(next.fuel).toBe('DIESEL,PETROL');
    expect(next.sort).toBe('newest');
  });
});
