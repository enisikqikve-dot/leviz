import { NextResponse } from 'next/server';

/**
 * Die Vorlage fuer den Bestandsimport.
 *
 * Drei Entscheidungen, die alle denselben Grund haben -- die Datei wird in
 * Excel geoeffnet, nicht in einem Texteditor:
 *
 * Semikolon als Trennzeichen, weil Excel auf einem Rechner mit deutscher,
 * albanischer oder mazedonischer Einstellung eine kommagetrennte Datei in eine
 * einzige Spalte legt.
 *
 * Byte-Reihenfolge-Markierung am Anfang, sonst zeigt Excel "Ã«" statt "ë".
 *
 * Windows-Zeilenenden, weil aeltere Excel-Fassungen mit blossen Zeilenvorschueben
 * nicht umgehen.
 */

const SPRACHEN = ['sq', 'de', 'en'] as const;
type Sprache = (typeof SPRACHEN)[number];

const KOPFZEILEN: Record<Sprache, string[]> = {
  sq: [
    'Marka', 'Modeli', 'Varianti', 'Viti', 'Kilometrazhi', 'Karburanti',
    'Transmisioni', 'Fuqia', 'Karoseria', 'Tërheqja', 'Ngjyra',
    'Çmimi', 'Qyteti', 'Dogana', 'Targat', 'Pa aksident',
    'Historiku i servisit', 'Numri i shasisë', 'Fotot', 'Përshkrimi',
  ],
  de: [
    'Marke', 'Modell', 'Variante', 'Baujahr', 'Kilometerstand', 'Kraftstoff',
    'Getriebe', 'Leistung', 'Karosserie', 'Antrieb', 'Farbe',
    'Preis', 'Stadt', 'Zoll', 'Kennzeichen', 'Unfallfrei',
    'Servicehistorie', 'Fahrgestellnummer', 'Bilder', 'Beschreibung',
  ],
  en: [
    'Brand', 'Model', 'Variant', 'Year', 'Mileage', 'Fuel',
    'Transmission', 'Power', 'Body', 'Drive', 'Color',
    'Price', 'City', 'Customs', 'Plates', 'Accident free',
    'Service history', 'VIN', 'Images', 'Description',
  ],
};

const BEISPIELE: Record<Sprache, string[][]> = {
  sq: [
    [
      'BMW', '3er', '320d', '2018', '150000', 'Naftë', 'Automatik', '190 PS',
      'Sedan', 'Prapa', 'E zezë', '18500', 'Prishtinë', 'E zhdoganuar', 'RKS',
      'Po', 'Po', '', 'https://shembull.com/1.jpg|https://shembull.com/2.jpg',
      'Vetura në gjendje shumë të mirë, e mirëmbajtur rregullisht.',
    ],
  ],
  de: [
    [
      'BMW', '3er', '320d', '2018', '150000', 'Diesel', 'Automatik', '190 PS',
      'Limousine', 'Heckantrieb', 'Schwarz', '18500', 'Prishtinë', 'verzollt', 'RKS',
      'Ja', 'Ja', '', 'https://beispiel.com/1.jpg|https://beispiel.com/2.jpg',
      'Fahrzeug in sehr gutem Zustand, regelmäßig gewartet.',
    ],
  ],
  en: [
    [
      'BMW', '3er', '320d', '2018', '150000', 'Diesel', 'Automatic', '190 hp',
      'Sedan', 'RWD', 'Black', '18500', 'Prishtinë', 'Cleared', 'RKS',
      'Yes', 'Yes', '', 'https://example.com/1.jpg|https://example.com/2.jpg',
      'Vehicle in very good condition, serviced regularly.',
    ],
  ],
};

/** Ein Feld, das ein Semikolon oder Anfuehrungszeichen enthaelt, wird gequotet. */
function feld(wert: string): string {
  return /[";\r\n]/.test(wert) ? `"${wert.replace(/"/g, '""')}"` : wert;
}

export async function GET(request: Request) {
  const angefragt = new URL(request.url).searchParams.get('lang');
  const sprache: Sprache = SPRACHEN.includes(angefragt as Sprache)
    ? (angefragt as Sprache)
    : 'sq';

  const zeilen = [KOPFZEILEN[sprache], ...BEISPIELE[sprache]]
    .map((zeile) => zeile.map(feld).join(';'))
    .join('\r\n');

  return new NextResponse(`﻿${zeilen}\r\n`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="leviz-import-${sprache}.csv"`,
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
