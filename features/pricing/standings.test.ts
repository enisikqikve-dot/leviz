import { describe, expect, it } from 'vitest';

import { standingsFor, type StandingComparable, type StandingItem } from './standings';

/** Ein Vergleichsfahrzeug desselben Modells, Baujahr und Laufleistung gleich. */
function vergleich(id: string, priceEuro: number): StandingComparable {
  return { id, modelId: 'm1', priceCents: priceEuro * 100, year: 2016, mileageKm: 120_000 };
}

function inserat(id: string, priceEuro: number): StandingItem {
  return { id, modelId: 'm1', priceCents: priceEuro * 100, year: 2016, mileageKm: 120_000 };
}

describe('standingsFor', () => {
  const markt = [
    vergleich('v1', 10_000),
    vergleich('v2', 10_500),
    vergleich('v3', 11_000),
    vergleich('v4', 11_500),
    vergleich('v5', 12_000),
  ];

  it('erkennt ein Angebot unter dem Markt', () => {
    const ergebnis = standingsFor([inserat('a', 7_000)], markt);
    expect(ergebnis.get('a')).toBe('below');
  });

  it('erkennt ein Angebot ueber dem Markt', () => {
    const ergebnis = standingsFor([inserat('a', 20_000)], markt);
    expect(ergebnis.get('a')).toBe('above');
  });

  it('erkennt ein Angebot im Rahmen', () => {
    const ergebnis = standingsFor([inserat('a', 11_000)], markt);
    expect(ergebnis.get('a')).toBe('within');
  });

  it('sagt bei zu wenigen Vergleichen gar nichts', () => {
    // Lieber kein Siegel als eines, das auf zwei Inseraten beruht: der Kaeufer
    // trifft danach eine Kaufentscheidung.
    const ergebnis = standingsFor([inserat('a', 9_000)], [vergleich('v1', 10_000)]);
    expect(ergebnis.has('a')).toBe(false);
  });

  it('rechnet ein Fahrzeug nicht gegen sich selbst', () => {
    // Dasselbe Auto steht auch in der Vergleichsmenge -- es kommt ja aus
    // derselben Abfrage. Zieht es den Schnitt zu sich hin, liegt jedes Inserat
    // faelschlich "im Rahmen".
    const teuer = inserat('a', 30_000);
    const mitSichSelbst = [...markt, { ...teuer, modelId: 'm1' } as StandingComparable];

    expect(standingsFor([teuer], mitSichSelbst).get('a')).toBe('above');
  });

  it('vergleicht nur innerhalb desselben Modells', () => {
    // Ein 5er gegen X5 und 7er gerechnet steht immer "unter dem Markt".
    const fremd = markt.map((eintrag) => ({ ...eintrag, modelId: 'm2' }));
    const ergebnis = standingsFor([inserat('a', 7_000)], fremd);

    expect(ergebnis.has('a')).toBe(false);
  });

  it('beurteilt mehrere Inserate in einem Durchgang', () => {
    const ergebnis = standingsFor([inserat('a', 7_000), inserat('b', 20_000)], markt);

    expect(ergebnis.get('a')).toBe('below');
    expect(ergebnis.get('b')).toBe('above');
  });

  it('kommt mit einer leeren Liste zurecht', () => {
    expect(standingsFor([], markt).size).toBe(0);
  });
});
