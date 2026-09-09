import { describe, expect, it } from 'vitest';

import {
  mapColumns, normalizeHeader, parseBody, parseBoolean, parseColor, parseCustoms,
  parseDrive, parseFuel, parseImageUrls, parseNumber, parsePlates, parsePowerKw,
  parseTransmission, parseYearMonth,
} from './columns';

describe('normalizeHeader', () => {
  it('nimmt albanische Sonderzeichen ihre Akzente', () => {
    expect(normalizeHeader('Çmimi')).toBe('cmimi');
    expect(normalizeHeader('Përshkrimi')).toBe('pershkrimi');
  });

  it('wirft Klammern und Einheiten weg', () => {
    expect(normalizeHeader('Preis (€)')).toBe('preis');
    expect(normalizeHeader('KM-Stand')).toBe('kmstand');
  });
});

describe('mapColumns', () => {
  it('findet die Spalten einer albanischen Datei', () => {
    const { columns } = mapColumns(['Marka', 'Modeli', 'Viti', 'Çmimi']);

    expect(columns.brand).toBe(0);
    expect(columns.model).toBe(1);
    expect(columns.year).toBe(2);
    expect(columns.price).toBe(3);
  });

  it('findet dieselben Spalten in einer deutschen Datei', () => {
    const { columns } = mapColumns(['Hersteller', 'Modell', 'Baujahr', 'Preis']);

    expect(columns.brand).toBe(0);
    expect(columns.model).toBe(1);
    expect(columns.year).toBe(2);
    expect(columns.price).toBe(3);
  });

  it('meldet unbekannte Spalten, statt sie stumm zu schlucken', () => {
    // Der Haendler soll sehen, dass seine Spalte "Interne Nr." ignoriert wird.
    const { unknown } = mapColumns(['Marka', 'Interne Nr.']);

    expect(unknown).toEqual(['Interne Nr.']);
  });

  it('nimmt bei doppelten Spalten die linke', () => {
    const { columns } = mapColumns(['PS', 'kW']);
    expect(columns.power).toBe(0);
  });
});

describe('parseNumber', () => {
  it('liest deutsche Tausendertrennung', () => {
    expect(parseNumber('18.000')).toBe(18000);
  });

  it('liest englische Tausendertrennung', () => {
    expect(parseNumber('18,000')).toBe(18000);
  });

  it('liest ein Komma als Dezimaltrennzeichen', () => {
    expect(parseNumber('7,4')).toBe(7.4);
  });

  it('liest einen Punkt als Dezimaltrennzeichen', () => {
    expect(parseNumber('7.4')).toBe(7.4);
  });

  it('kommt mit beiden Trennzeichen zurecht', () => {
    expect(parseNumber('1.234,56')).toBe(1234.56);
    expect(parseNumber('1,234.56')).toBe(1234.56);
  });

  it('wirft Einheiten und Waehrungen weg', () => {
    expect(parseNumber('18.000 €')).toBe(18000);
    expect(parseNumber('150 PS')).toBe(150);
    expect(parseNumber('150.000 km')).toBe(150000);
  });

  it('gibt bei leerem Feld nichts zurueck', () => {
    expect(parseNumber('')).toBeNull();
    expect(parseNumber('  ')).toBeNull();
    expect(parseNumber('k.A.')).toBeNull();
  });
});

describe('parseFuel', () => {
  it('erkennt Diesel in allen drei Sprachen', () => {
    expect(parseFuel('Naftë')).toBe('DIESEL');
    expect(parseFuel('Diesel')).toBe('DIESEL');
    expect(parseFuel('Dizel')).toBe('DIESEL');
  });

  it('erkennt Benzin', () => {
    expect(parseFuel('Benzinë')).toBe('PETROL');
    expect(parseFuel('Petrol')).toBe('PETROL');
  });

  it('haelt Hybrid von Benzin auseinander', () => {
    // "benzin" steckt in "hybridbenzin" -- ohne Vorrang der genauen
    // Uebereinstimmung wuerde jeder Hybrid als Benziner ankommen.
    expect(parseFuel('Hybrid Benzin')).toBe('HYBRID_PETROL');
    expect(parseFuel('Plug-in Hybrid')).toBe('PLUGIN_HYBRID');
  });

  it('erkennt Elektro', () => {
    expect(parseFuel('Elektrik')).toBe('ELECTRIC');
    expect(parseFuel('Elektro')).toBe('ELECTRIC');
  });

  it('nimmt die eigene Kennung aus einem frueheren Export an', () => {
    expect(parseFuel('DIESEL')).toBe('DIESEL');
  });

  it('gibt bei Unbekanntem nichts zurueck, statt zu raten', () => {
    expect(parseFuel('Wasserdampf')).toBeNull();
    expect(parseFuel('')).toBeNull();
  });
});

describe('parseTransmission', () => {
  it('erkennt Handschaltung', () => {
    expect(parseTransmission('Manuale')).toBe('MANUAL');
    expect(parseTransmission('Schaltgetriebe')).toBe('MANUAL');
    // "Manuell" fehlte zuerst und fiel erst beim Durchgang mit einer echten
    // Datei auf -- "manuell" enthaelt "manual" nicht.
    expect(parseTransmission('Manuell')).toBe('MANUAL');
  });

  it('erkennt Automatik, auch unter ihren Handelsnamen', () => {
    expect(parseTransmission('Automatik')).toBe('AUTOMATIC');
    expect(parseTransmission('DSG')).toBe('AUTOMATIC');
    expect(parseTransmission('Tiptronic')).toBe('AUTOMATIC');
  });
});

describe('parseBody', () => {
  it('erkennt den Kombi unter seinen vielen Namen', () => {
    expect(parseBody('Karavan')).toBe('ESTATE');
    expect(parseBody('Kombi')).toBe('ESTATE');
    expect(parseBody('Touring')).toBe('ESTATE');
  });

  it('erkennt den Gelaendewagen', () => {
    expect(parseBody('SUV')).toBe('SUV');
    expect(parseBody('Xhip')).toBe('SUV');
  });
});

describe('parseDrive', () => {
  it('erkennt Allrad unter den Herstellernamen', () => {
    expect(parseDrive('quattro')).toBe('AWD');
    expect(parseDrive('xDrive')).toBe('AWD');
    expect(parseDrive('4x4')).toBe('AWD');
  });
});

describe('parseCustoms', () => {
  it('erkennt verzollt und unverzollt', () => {
    expect(parseCustoms('E zhdoganuar')).toBe('CLEARED');
    expect(parseCustoms('verzollt')).toBe('CLEARED');
    expect(parseCustoms('E pazhdoganuar')).toBe('NOT_CLEARED');
    expect(parseCustoms('unverzollt')).toBe('NOT_CLEARED');
  });

  it('versteht ein blosses Ja oder Nein in der Zollspalte', () => {
    expect(parseCustoms('Po')).toBe('CLEARED');
    expect(parseCustoms('Jo')).toBe('NOT_CLEARED');
  });
});

describe('parsePlates', () => {
  it('erkennt die Herkunft der Kennzeichen', () => {
    expect(parsePlates('RKS')).toBe('RKS');
    expect(parsePlates('Kosovë')).toBe('RKS');
    expect(parsePlates('Të huaja')).toBe('FOREIGN');
  });
});

describe('parseColor', () => {
  it('erkennt Farben in allen drei Sprachen', () => {
    expect(parseColor('E zezë')).toBe('black');
    expect(parseColor('Schwarz')).toBe('black');
    expect(parseColor('White')).toBe('white');
  });
});

describe('parseBoolean', () => {
  it('erkennt Zustimmung in allen drei Sprachen', () => {
    for (const wert of ['Po', 'Ja', 'yes', 'TRUE', '1', 'x']) {
      expect(parseBoolean(wert)).toBe(true);
    }
  });

  it('erkennt Ablehnung', () => {
    for (const wert of ['Jo', 'Nein', 'no', 'false', '0']) {
      expect(parseBoolean(wert)).toBe(false);
    }
  });

  it('unterscheidet ein leeres Feld von einem Nein', () => {
    // Leer heisst "nicht angegeben", nicht "nein" -- sonst wird aus einem
    // fehlenden Wert stillschweigend eine Aussage.
    expect(parseBoolean('')).toBeNull();
    expect(parseBoolean('vielleicht')).toBeNull();
  });
});

describe('parseYearMonth', () => {
  it('liest ein blosses Jahr', () => {
    expect(parseYearMonth('2018')).toEqual({ year: 2018, month: 1 });
  });

  it('liest Monat und Jahr', () => {
    expect(parseYearMonth('03/2018')).toEqual({ year: 2018, month: 3 });
    expect(parseYearMonth('2018-03')).toEqual({ year: 2018, month: 3 });
  });

  it('gibt ohne Jahr nichts zurueck', () => {
    expect(parseYearMonth('03')).toBeNull();
    expect(parseYearMonth('')).toBeNull();
  });
});

describe('parsePowerKw', () => {
  it('rechnet PS in Kilowatt um', () => {
    expect(parsePowerKw('150 PS')).toBe(110);
  });

  it('uebernimmt Kilowatt unveraendert', () => {
    expect(parsePowerKw('110 kW')).toBe(110);
  });

  it('nimmt die Einheit aus der Spaltenueberschrift, wenn der Wert schweigt', () => {
    expect(parsePowerKw('110', 'kW')).toBe(110);
    expect(parsePowerKw('150', 'PS')).toBe(110);
  });

  it('nimmt ohne jede Angabe PS an', () => {
    // Haendler in der Region schreiben PS. 150 als Kilowatt zu lesen ergaebe
    // ein Fahrzeug mit 204 PS -- ein Fehler, der niemandem auffiele.
    expect(parsePowerKw('150', 'Fuqia')).toBe(110);
  });

  it('lehnt Unsinn ab', () => {
    expect(parsePowerKw('0')).toBeNull();
    expect(parsePowerKw('')).toBeNull();
  });
});

describe('parseImageUrls', () => {
  it('trennt an senkrechtem Strich', () => {
    expect(parseImageUrls('https://a.com/1.jpg|https://a.com/2.jpg')).toEqual([
      'https://a.com/1.jpg',
      'https://a.com/2.jpg',
    ]);
  });

  it('trennt an Leerraum und Zeilenumbruch', () => {
    expect(parseImageUrls('https://a.com/1.jpg\nhttps://a.com/2.jpg')).toHaveLength(2);
  });

  it('gibt bei leerem Feld eine leere Liste zurueck', () => {
    expect(parseImageUrls('')).toEqual([]);
  });
});
