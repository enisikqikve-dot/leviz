import { describe, expect, it } from 'vitest';

import type { AiCatalog } from './index';
import { fold, interpretSearchText, LocalAiProvider } from './local';

const catalog: AiCatalog = {
  brands: new Map([
    ['bmw', 'BMW'],
    ['volkswagen', 'Volkswagen'],
    ['mercedes-benz', 'Mercedes-Benz'],
    ['land-rover', 'Land Rover'],
    ['skoda', 'Škoda'],
  ]),
  models: new Map([
    ['golf', { name: 'Golf', brandSlug: 'volkswagen' }],
    ['passat', { name: 'Passat', brandSlug: 'volkswagen' }],
    ['3er', { name: '3er', brandSlug: 'bmw' }],
    ['range-rover-sport', { name: 'Range Rover Sport', brandSlug: 'land-rover' }],
    ['octavia', { name: 'Octavia', brandSlug: 'skoda' }],
  ]),
  cities: new Map([
    ['prishtine', 'Prishtinë'],
    ['tirane', 'Tiranë'],
    ['prizren', 'Prizren'],
  ]),
};

const read = (text: string, locale: 'sq' | 'de' | 'en' = 'sq') =>
  interpretSearchText(text, locale, catalog).intent;

describe('Diakritika falten', () => {
  it('macht Prishtinë auffindbar', () => {
    expect(fold('Prishtinë')).toBe('prishtine');
  });

  it('macht Škoda auffindbar', () => {
    expect(fold('Škoda')).toBe('skoda');
  });

  it('behandelt ç wie c', () => {
    expect(fold('Ferizaj çmimi')).toBe('ferizaj cmimi');
  });
});

describe('Marke und Modell', () => {
  it('erkennt die Marke', () => {
    expect(read('bmw').make).toBe('bmw');
  });

  it('erkennt Marke und Modell zusammen', () => {
    expect(read('volkswagen golf')).toMatchObject({ make: 'volkswagen', model: 'golf' });
  });

  it('leitet die Marke aus dem Modell ab', () => {
    expect(read('octavia')).toMatchObject({ make: 'skoda', model: 'octavia' });
  });

  it('nimmt den längeren Markennamen zuerst', () => {
    // „Land Rover“ darf nicht als „Rover“ enden.
    expect(read('land rover range rover sport')).toMatchObject({
      make: 'land-rover',
      model: 'range-rover-sport',
    });
  });

  it('findet die Marke trotz Sonderzeichen', () => {
    expect(read('škoda octavia').make).toBe('skoda');
  });

  it('nimmt kein Modell einer anderen Marke', () => {
    // „BMW Golf“ gibt es nicht; die Marke gewinnt.
    const intent = read('bmw golf');
    expect(intent.make).toBe('bmw');
    expect(intent.model).toBeUndefined();
  });
});

describe('Preisgrenzen', () => {
  it('liest eine Obergrenze auf Albanisch', () => {
    expect(read('golf deri 5000 euro').priceMax).toBe(5000);
  });

  it('liest eine Obergrenze auf Deutsch', () => {
    expect(read('golf bis 5000 euro', 'de').priceMax).toBe(5000);
  });

  it('liest eine Obergrenze auf Englisch', () => {
    expect(read('golf under 5000 euro', 'en').priceMax).toBe(5000);
  });

  it('liest eine Untergrenze', () => {
    expect(read('bmw mbi 10000 euro').priceMin).toBe(10_000);
  });

  it('versteht die Kurzform mit k', () => {
    expect(read('golf deri 8k euro').priceMax).toBe(8000);
  });

  it('versteht einen Punkt als Tausendertrennung', () => {
    expect(read('golf deri 12.500 euro').priceMax).toBe(12_500);
  });

  it('nimmt das Eurozeichen als Einheit an', () => {
    expect(read('passat 9000€').priceMax).toBe(9000);
  });
});

describe('Baujahr und Kilometer', () => {
  it('liest ein Baujahr als Untergrenze', () => {
    expect(read('golf nga 2015').yearMin).toBe(2015);
  });

  it('liest ein Baujahr als Obergrenze', () => {
    expect(read('golf deri 2015').yearMax).toBe(2015);
  });

  it('liest den Kilometerstand', () => {
    expect(read('golf deri 200000 km').mileageMax).toBe(200_000);
  });

  it('versteht tkm als Tausend Kilometer', () => {
    expect(read('golf 150 tkm').mileageMax).toBe(150_000);
  });

  it('verwechselt eine Jahreszahl nicht mit einem Preis', () => {
    const intent = read('golf 2015');
    expect(intent.yearMin).toBe(2015);
    expect(intent.priceMax).toBeUndefined();
  });
});

describe('Stichwörter', () => {
  it('erkennt Diesel auf Albanisch', () => {
    expect(read('golf naftë').fuel).toEqual(['DIESEL']);
  });

  it('erkennt Diesel auf Deutsch', () => {
    expect(read('golf diesel', 'de').fuel).toEqual(['DIESEL']);
  });

  it('erkennt Automatik', () => {
    expect(read('golf automatik').transmission).toEqual(['AUTOMATIC']);
  });

  it('erkennt einen Geländewagen am regionalen Wort', () => {
    expect(read('xhip deri 15000 euro').bodyType).toEqual(['SUV']);
  });

  it('erkennt verzollt', () => {
    expect(read('golf i doganuar').customs).toEqual(['CLEARED']);
  });

  it('unterscheidet unverzollt von verzollt', () => {
    // Die Verneinung enthält das andere Wort als Teilzeichenkette.
    expect(read('golf i padoganuar').customs).toEqual(['NOT_CLEARED']);
  });

  it('erkennt das Kennzeichen', () => {
    expect(read('golf targa rks').plates).toEqual(['RKS']);
  });

  it('erkennt die Stadt', () => {
    expect(read('golf në Prishtinë').city).toBe('prishtine');
  });
});

describe('Ganze Sätze', () => {
  it('liest eine vollständige albanische Anfrage', () => {
    const intent = read('volkswagen golf naftë automatik deri 8000 euro në Prishtinë i doganuar');

    expect(intent).toMatchObject({
      make: 'volkswagen',
      model: 'golf',
      fuel: ['DIESEL'],
      transmission: ['AUTOMATIC'],
      priceMax: 8000,
      city: 'prishtine',
      customs: ['CLEARED'],
    });
  });

  it('liest eine deutsche Anfrage', () => {
    const intent = read('BMW 3er diesel automatik bis 12000 euro', 'de');

    expect(intent).toMatchObject({
      make: 'bmw',
      model: '3er',
      fuel: ['DIESEL'],
      priceMax: 12_000,
    });
  });

  it('meldet, was es nicht verstanden hat', () => {
    const result = interpretSearchText('golf mit rotem lenkrad', 'de', catalog);

    expect(result.intent.model).toBe('golf');
    expect(result.ignored.length).toBeGreaterThan(0);
  });

  it('setzt bei einem leeren Text nichts', () => {
    expect(read('')).toEqual({});
  });

  it('setzt bei reinem Kauderwelsch nichts', () => {
    expect(read('qwertz asdfgh')).toEqual({});
  });
});

describe('Beschreibung', () => {
  const provider = new LocalAiProvider();

  const base = {
    brand: 'Volkswagen',
    model: 'Golf',
    variant: '2.0 TDI',
    year: 2014,
    mileageKm: 187_500,
    locale: 'sq' as const,
  };

  it('nennt Marke, Modell, Baujahr und Kilometerstand', async () => {
    const text = await provider.describe(base);

    expect(text).toContain('Volkswagen Golf 2.0 TDI');
    expect(text).toContain('2014');
    expect(text).toContain('187.500 km');
  });

  it('gruppiert die Zahlen im englischen Format anders', async () => {
    const text = await provider.describe({ ...base, locale: 'en' });
    expect(text).toContain('187,500 km');
  });

  it('rechnet die Leistung in Pferdestärken um', async () => {
    const text = await provider.describe({ ...base, powerKw: 110 });
    expect(text).toContain('150 kf');
  });

  it('erwähnt den Zollstatus', async () => {
    const cleared = await provider.describe({ ...base, customsStatus: 'CLEARED' });
    const not = await provider.describe({ ...base, customsStatus: 'NOT_CLEARED' });

    expect(cleared).toContain('e doganuar');
    expect(not).toContain('nuk është e doganuar');
  });

  it('erfindet nichts, was nicht übergeben wurde', async () => {
    const text = await provider.describe(base);

    // Ohne Angabe darf weder Unfallfreiheit noch Ausstattung auftauchen.
    expect(text).not.toContain('Pa aksidente');
    expect(text).not.toContain('Pajisje');
    expect(text).not.toContain('Targa');
  });

  it('lässt fehlende Felder einfach weg, ohne Lücken im Satz', async () => {
    const text = await provider.describe({
      brand: 'Fiat', model: 'Punto', year: null, mileageKm: null, locale: 'de',
    });

    expect(text).toContain('Fiat Punto');
    // Doppelte Leerzeichen wären die Spur eines weggelassenen Feldes.
    // Der Absatzumbruch dazwischen ist gewollt und deshalb ausgenommen.
    expect(text).not.toMatch(/ {2,}/);
    expect(text).not.toMatch(/ ,|,,|\.\./);
    expect(text).not.toContain('undefined');
    expect(text).not.toContain('null');
  });

  it('führt höchstens acht Ausstattungsmerkmale auf', async () => {
    const features = Array.from({ length: 20 }, (_, i) => `Merkmal ${i + 1}`);
    const text = await provider.describe({ ...base, features });

    expect(text).toContain('Merkmal 8');
    expect(text).not.toContain('Merkmal 9');
  });
});

describe('Was als nicht verstanden gemeldet wird', () => {
  it('meldet die Währung nicht als unverstanden', () => {
    // Sie wurde ja gerade als Einheit des Preises verwendet.
    const result = interpretSearchText('golf deri 8000 euro', 'sq', catalog);

    expect(result.intent.priceMax).toBe(8000);
    expect(result.ignored).not.toContain('euro');
  });

  it('meldet Füllwörter nicht', () => {
    const result = interpretSearchText('golf në Prishtinë me naftë', 'sq', catalog);
    expect(result.ignored).toEqual([]);
  });

  it('meldet echte Unbekannte weiterhin', () => {
    const result = interpretSearchText('golf me sedilje portokalli', 'sq', catalog);
    expect(result.ignored.length).toBeGreaterThan(0);
  });
});
