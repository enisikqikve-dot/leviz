import { describe, expect, it } from 'vitest';

import { buildComparisonRows, onlyDifferences } from './rows';

describe('Vergleichstabelle', () => {
  it('erkennt eine Zeile ohne Unterschied', () => {
    const [row] = buildComparisonRows([
      { key: 'fuel', label: 'Kraftstoff', values: ['Diesel', 'Diesel', 'Diesel'] },
    ]);
    expect(row.differs).toBe(false);
    expect(row.best).toEqual([]);
  });

  it('erkennt eine Zeile mit Unterschied', () => {
    const [row] = buildComparisonRows([
      { key: 'fuel', label: 'Kraftstoff', values: ['Diesel', 'Benzin'] },
    ]);
    expect(row.differs).toBe(true);
  });

  it('markiert den niedrigsten Preis als besten Wert', () => {
    const [row] = buildComparisonRows([
      {
        key: 'price', label: 'Preis',
        values: ['12.000 €', '9.500 €', '15.000 €'],
        numbers: [12000, 9500, 15000],
        lowerIsBetter: true,
      },
    ]);
    expect(row.best).toEqual([1]);
  });

  it('markiert die hoechste Leistung als besten Wert', () => {
    const [row] = buildComparisonRows([
      {
        key: 'power', label: 'Leistung',
        values: ['150 PS', '190 PS'],
        numbers: [150, 190],
      },
    ]);
    expect(row.best).toEqual([1]);
  });

  it('markiert nichts, wenn alle gleich gut sind', () => {
    const [row] = buildComparisonRows([
      { key: 'power', label: 'Leistung', values: ['150 PS', '150 PS'], numbers: [150, 150] },
    ]);
    expect(row.best).toEqual([]);
  });

  it('kommt mit fehlenden Werten zurecht', () => {
    const [row] = buildComparisonRows([
      {
        key: 'consumption', label: 'Verbrauch',
        values: ['5,4 l', null, '6,1 l'],
        numbers: [5.4, null, 6.1],
        lowerIsBetter: true,
      },
    ]);
    expect(row.differs).toBe(true);
    expect(row.best).toEqual([0]);
  });

  it('haelt eine Zeile mit nur einem gefuellten Wert fuer gleich', () => {
    const [row] = buildComparisonRows([
      { key: 'vin', label: 'Fahrgestellnummer', values: [null, 'WVW123', null] },
    ]);
    expect(row.differs).toBe(false);
  });

  it('filtert auf die Unterschiede', () => {
    const rows = buildComparisonRows([
      { key: 'fuel', label: 'Kraftstoff', values: ['Diesel', 'Diesel'] },
      { key: 'year', label: 'Baujahr', values: ['2016', '2019'] },
    ]);
    const differences = onlyDifferences(rows);
    expect(differences).toHaveLength(1);
    expect(differences[0].key).toBe('year');
  });
});
