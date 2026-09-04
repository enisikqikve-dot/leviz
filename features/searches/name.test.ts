import { describe, expect, it } from 'vitest';

import { parseSearchParams } from '@/features/search/schema';

import { suggestSearchName, type LabelLookup } from './name';

const labels: LabelLookup = {
  fuel: (value) => ({ DIESEL: 'Diesel', PETROL: 'Benzin' })[value] ?? value,
  transmission: (value) => (value === 'AUTOMATIC' ? 'Automatik' : 'Schaltgetriebe'),
  body: (value) => (value === 'SUV' ? 'SUV' : value),
  customs: (value) => (value === 'CLEARED' ? 'Verzollt' : 'Unverzollt'),
  price: (eur) => `${eur.toLocaleString('de-DE')} €`,
  upTo: 'bis',
  from: 'ab',
};

describe('Namensvorschlag fuer Suchauftraege', () => {
  it('nennt Marke, Kraftstoff und Preisgrenze', () => {
    const params = parseSearchParams({ make: 'bmw', fuel: 'DIESEL', priceMax: '15000' });
    const name = suggestSearchName(params, { ...labels, brand: 'BMW' });
    expect(name).toBe('BMW · Diesel · bis 15.000 €');
  });

  it('nimmt Marke und Modell auf', () => {
    const params = parseSearchParams({ make: 'bmw', model: '3er' });
    expect(suggestSearchName(params, { ...labels, brand: 'BMW', model: '3er' }))
      .toBe('BMW · 3er');
  });

  it('nennt eine Mehrfachauswahl nicht, weil sie nicht unterscheidet', () => {
    const params = parseSearchParams({ make: 'audi', fuel: 'DIESEL,PETROL' });
    expect(suggestSearchName(params, { ...labels, brand: 'Audi' })).toBe('Audi');
  });

  it('stellt den Freitext voran', () => {
    const params = parseSearchParams({ q: 'Golf GTD', fuel: 'DIESEL' });
    expect(suggestSearchName(params, labels)).toBe('Golf GTD · Diesel');
  });

  it('nutzt die Untergrenze, wenn keine Obergrenze gesetzt ist', () => {
    const params = parseSearchParams({ priceMin: '5000' });
    expect(suggestSearchName(params, labels)).toBe('ab 5.000 €');
  });

  it('nimmt den Zollstatus auf, das wichtigste Merkmal der Region', () => {
    const params = parseSearchParams({ make: 'vw', customs: 'CLEARED' });
    expect(suggestSearchName(params, { ...labels, brand: 'Volkswagen' }))
      .toBe('Volkswagen · Verzollt');
  });

  it('bleibt kurz und nennt hoechstens vier Merkmale', () => {
    const params = parseSearchParams({
      make: 'bmw', model: '3er', fuel: 'DIESEL',
      transmission: 'AUTOMATIC', bodyType: 'SUV', priceMax: '20000',
    });
    const name = suggestSearchName(params, { ...labels, brand: 'BMW', model: '3er' });
    expect(name.split(' · ')).toHaveLength(4);
  });

  it('gibt bei fehlenden Filtern einen leeren Vorschlag zurueck', () => {
    expect(suggestSearchName(parseSearchParams({}), labels)).toBe('');
  });
});
