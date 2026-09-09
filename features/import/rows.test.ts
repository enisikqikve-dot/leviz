import { describe, expect, it } from 'vitest';

import { parseCsv } from './csv';
import { prepareFile, type PrepareOptions } from './rows';

const OHNE_TEXT: PrepareOptions = {
  generateDescription: false,
  describe: () => '',
};

const MIT_TEXT: PrepareOptions = {
  generateDescription: true,
  describe: (parts) =>
    `${parts.brand} ${parts.model} · ${parts.year} · ${parts.mileageKm} km · ${parts.fuel}`,
};

const KOPF = 'Marka;Modeli;Viti;Kilometrazhi;Karburanti;Transmisioni;Fuqia;Karoseria;Çmimi;Qyteti;Fotot;Përshkrimi';
const ZEILE =
  'BMW;320d;2018;150.000 km;Naftë;Automatik;190 PS;Sedan;18.500 €;Prishtinë;https://a.com/1.jpg|https://a.com/2.jpg;Vetura në gjendje shumë të mirë, e mirëmbajtur rregullisht.';

function lies(csv: string, options: PrepareOptions = OHNE_TEXT) {
  const tabelle = parseCsv(csv);
  return prepareFile(tabelle.header, tabelle.rows, options);
}

describe('prepareFile', () => {
  it('uebersetzt eine vollstaendige albanische Zeile', () => {
    const datei = lies(`${KOPF}\n${ZEILE}`);

    expect(datei.missingColumns).toEqual([]);
    expect(datei.rows).toHaveLength(1);

    const zeile = datei.rows[0]!;
    expect(zeile.problems).toEqual([]);
    expect(zeile.brandName).toBe('BMW');
    expect(zeile.modelName).toBe('320d');
    expect(zeile.cityName).toBe('Prishtinë');
    expect(zeile.imageUrls).toHaveLength(2);

    expect(zeile.values).toMatchObject({
      registrationYear: 2018,
      mileageKm: 150_000,
      fuel: 'DIESEL',
      transmission: 'AUTOMATIC',
      powerKw: 140,
      bodyType: 'SEDAN',
      priceEur: 18_500,
    });
  });

  it('nennt fehlende Pflichtspalten einmal statt bei jeder Zeile', () => {
    // Vierzig Zeilen mit demselben Fehler sind unlesbar; der Haendler soll
    // "Spalte Çmimi fehlt" lesen und die Datei ergaenzen.
    const datei = lies('Marka;Modeli\nBMW;320d\nAudi;A4');

    expect(datei.missingColumns).toContain('price');
    expect(datei.rows).toEqual([]);
  });

  it('meldet unbekannte Spalten, ohne die Zeile abzulehnen', () => {
    const datei = lies(`${KOPF};Nr. interne\n${ZEILE};4711`);

    expect(datei.unknownColumns).toEqual(['Nr. interne']);
    expect(datei.rows[0]?.problems).toEqual([]);
  });

  it('meldet eine unlesbare Zahl mit Feld und Zeile', () => {
    const kaputt = ZEILE.replace('18.500 €', 'me marreveshje');
    const datei = lies(`${KOPF}\n${kaputt}`);

    expect(datei.rows[0]?.problems).toContainEqual({ field: 'price', code: 'invalid' });
    expect(datei.rows[0]?.line).toBe(2);
    expect(datei.rows[0]?.values).toBeNull();
  });

  it('unterscheidet ein leeres Feld von einem unlesbaren', () => {
    const leer = ZEILE.replace('Naftë', '');
    expect(lies(`${KOPF}\n${leer}`).rows[0]?.problems).toContainEqual({
      field: 'fuel',
      code: 'missing',
    });

    const unsinn = ZEILE.replace('Naftë', 'Wasserdampf');
    expect(lies(`${KOPF}\n${unsinn}`).rows[0]?.problems).toContainEqual({
      field: 'fuel',
      code: 'invalid',
    });
  });

  it('lehnt eine Zeile ohne Foto ab', () => {
    // Ein Inserat ohne Bild laesst auch der Assistent nicht zu.
    const ohneBild = ZEILE.replace('https://a.com/1.jpg|https://a.com/2.jpg', '');
    const datei = lies(`${KOPF}\n${ohneBild}`);

    expect(datei.rows[0]?.problems).toContainEqual({ field: 'images', code: 'noImages' });
  });

  it('lehnt eine zu kurze Beschreibung ab, solange nichts gebildet werden soll', () => {
    const kurz = ZEILE.replace(
      'Vetura në gjendje shumë të mirë, e mirëmbajtur rregullisht.',
      'Shitet',
    );
    const datei = lies(`${KOPF}\n${kurz}`);

    expect(datei.rows[0]?.problems).toContainEqual({ field: 'description', code: 'tooLow' });
  });

  it('bildet die Beschreibung aus den Angaben der Zeile, wenn erlaubt', () => {
    const kurz = ZEILE.replace(
      'Vetura në gjendje shumë të mirë, e mirëmbajtur rregullisht.',
      '',
    );
    const datei = lies(`${KOPF}\n${kurz}`, MIT_TEXT);
    const zeile = datei.rows[0]!;

    expect(zeile.problems).toEqual([]);
    expect(zeile.descriptionGenerated).toBe(true);
    expect(zeile.values?.description).toContain('BMW 320d');
    expect(zeile.values?.description).toContain('2018');
  });

  it('laesst eine vorhandene Beschreibung unangetastet', () => {
    const datei = lies(`${KOPF}\n${ZEILE}`, MIT_TEXT);

    expect(datei.rows[0]?.descriptionGenerated).toBe(false);
    expect(datei.rows[0]?.values?.description).toContain('mirëmbajtur');
  });

  it('uebernimmt Unfallfreiheit nur, wenn sie dasteht', () => {
    // Eine Zusicherung, die niemand gegeben hat, darf nicht aus einer leeren
    // Zelle entstehen.
    const datei = lies(`${KOPF}\n${ZEILE}`);
    expect(datei.rows[0]?.values?.accidentFree).toBe(false);

    const mit = lies(`${KOPF};Pa aksident\n${ZEILE};Po`);
    expect(mit.rows[0]?.values?.accidentFree).toBe(true);
  });

  it('nimmt bei fehlender Zollangabe verzollt an, mit Kosovo-Kennzeichen', () => {
    // Der Normalfall im Bestand eines Haendlers vor Ort.
    const datei = lies(`${KOPF}\n${ZEILE}`);

    expect(datei.rows[0]?.values?.customsStatus).toBe('CLEARED');
    expect(datei.rows[0]?.values?.plateOrigin).toBe('RKS');
  });

  it('meldet eine Fahrgestellnummer falscher Laenge', () => {
    const datei = lies(`${KOPF};VIN\n${ZEILE};ABC123`);

    expect(datei.rows[0]?.problems).toContainEqual({ field: 'vin', code: 'invalid' });
  });

  it('liest eine deutsche Datei genauso', () => {
    const kopf =
      'Hersteller;Modell;Baujahr;Kilometerstand;Kraftstoff;Getriebe;Leistung;Karosserie;Preis;Stadt;Bilder;Beschreibung';
    const zeile =
      'Audi;A4;03/2016;98.500;Diesel;Schaltgetriebe;150 PS;Kombi;14.900;Prizren;https://a.com/1.jpg;Sehr gepflegtes Fahrzeug aus zweiter Hand, scheckheftgepflegt.';

    const datei = lies(`${kopf}\n${zeile}`);
    const werte = datei.rows[0]?.values;

    expect(datei.rows[0]?.problems).toEqual([]);
    expect(werte).toMatchObject({
      registrationYear: 2016,
      registrationMonth: 3,
      mileageKm: 98_500,
      fuel: 'DIESEL',
      transmission: 'MANUAL',
      bodyType: 'ESTATE',
      priceEur: 14_900,
    });
  });

  it('beurteilt jede Zeile fuer sich', () => {
    const kaputt = ZEILE.replace('2018', 'kein Jahr');
    const datei = lies(`${KOPF}\n${ZEILE}\n${kaputt}\n${ZEILE}`);

    expect(datei.rows).toHaveLength(3);
    expect(datei.rows[0]?.problems).toEqual([]);
    expect(datei.rows[1]?.problems.length).toBeGreaterThan(0);
    expect(datei.rows[2]?.problems).toEqual([]);
  });
});
