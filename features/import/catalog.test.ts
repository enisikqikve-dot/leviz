import { describe, expect, it } from 'vitest';

import { matchBrand, matchCity, matchModel, modelSuggestions } from './catalog';

const BRANDS = [
  { id: 'b1', slug: 'bmw', name: 'BMW' },
  { id: 'b2', slug: 'mercedes-benz', name: 'Mercedes-Benz' },
  { id: 'b3', slug: 'volkswagen', name: 'Volkswagen' },
  { id: 'b4', slug: 'audi', name: 'Audi' },
];

const MODELS = [
  { id: 'm1', slug: '3er', name: '3er', brandSlug: 'bmw' },
  { id: 'm2', slug: '5er', name: '5er', brandSlug: 'bmw' },
  { id: 'm3', slug: 'x5', name: 'X5', brandSlug: 'bmw' },
  { id: 'm4', slug: 'c-klasse', name: 'C-Klasse', brandSlug: 'mercedes-benz' },
  { id: 'm5', slug: 'a4', name: 'A4', brandSlug: 'audi' },
  { id: 'm6', slug: 'a4-allroad', name: 'A4 allroad', brandSlug: 'audi' },
];

const CITIES = [
  { id: 'c1', slug: 'prishtine', name: 'Prishtinë' },
  { id: 'c2', slug: 'prizren', name: 'Prizren' },
  { id: 'c3', slug: 'tirane', name: 'Tiranë' },
];

describe('matchBrand', () => {
  it('findet die Marke bei genauem Namen', () => {
    expect(matchBrand('BMW', BRANDS)?.slug).toBe('bmw');
  });

  it('ist gleichgueltig gegen Gross- und Kleinschreibung', () => {
    expect(matchBrand('bmw', BRANDS)?.slug).toBe('bmw');
  });

  it('findet Mercedes-Benz ohne Bindestrich', () => {
    expect(matchBrand('Mercedes Benz', BRANDS)?.slug).toBe('mercedes-benz');
  });

  it('kennt gebraeuchliche Kuerzel', () => {
    expect(matchBrand('VW', BRANDS)?.slug).toBe('volkswagen');
    expect(matchBrand('Mercedes', BRANDS)?.slug).toBe('mercedes-benz');
  });

  it('raet nicht', () => {
    expect(matchBrand('Bimmer', BRANDS)).toBeNull();
    expect(matchBrand('', BRANDS)).toBeNull();
  });
});

describe('matchModel', () => {
  it('findet das Modell bei genauem Namen', () => {
    expect(matchModel('3er', 'bmw', MODELS)?.id).toBe('m1');
  });

  it('findet das Modell, wenn die Ausstattung danebensteht', () => {
    expect(matchModel('C-Klasse C200', 'mercedes-benz', MODELS)?.id).toBe('m4');
  });

  it('nimmt bei mehreren Treffern den laengeren Namen', () => {
    // "A4 allroad" darf nicht von "A4" beansprucht werden.
    expect(matchModel('A4 allroad', 'audi', MODELS)?.id).toBe('m6');
  });

  it('sucht nur innerhalb der Marke', () => {
    // Es gibt einen Audi A4, aber nicht bei BMW.
    expect(matchModel('A4', 'bmw', MODELS)).toBeNull();
  });

  it('raet nicht von der Motorbezeichnung auf das Modell', () => {
    // "320d" ist keine Modellbezeichnung. Lieber ein klarer Fehler mit
    // Vorschlaegen als ein Inserat unter dem falschen Modell.
    expect(matchModel('320d', 'bmw', MODELS)).toBeNull();
  });
});

describe('matchCity', () => {
  it('findet die Stadt trotz albanischer Sonderzeichen', () => {
    expect(matchCity('Prishtine', CITIES)?.slug).toBe('prishtine');
    expect(matchCity('Prishtinë', CITIES)?.slug).toBe('prishtine');
  });

  it('findet die Stadt in ihrer bestimmten Form', () => {
    // Albanisch hat zwei Formen desselben Namens. Beide stehen in echten
    // Dateien, beide meinen dieselbe Stadt.
    expect(matchCity('Prishtina', CITIES)?.slug).toBe('prishtine');
    expect(matchCity('Tirana', CITIES)?.slug).toBe('tirane');
  });

  it('raet nicht bei einem unbekannten Ort', () => {
    expect(matchCity('Berlin', CITIES)).toBeNull();
  });
});

describe('modelSuggestions', () => {
  it('nennt die Modelle der Marke fuer die Fehlermeldung', () => {
    expect(modelSuggestions('bmw', MODELS)).toEqual(['3er', '5er', 'X5']);
  });
});
