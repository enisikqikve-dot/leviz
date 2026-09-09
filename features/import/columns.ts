/**
 * Uebersetzt die Tabelle eines Haendlers in die Felder, die LEVIZ kennt.
 *
 * Ein Haendler exportiert aus dem Programm, das er ohnehin benutzt. Dort heisst
 * die Spalte "Marke", "marka", "Make" oder "Hersteller", und im Feld steht
 * "Naftë", "Diesel" oder "Dizel". Wer darauf besteht, dass die Datei exakt so
 * aussieht wie unsere Vorlage, bekommt keine Haendler -- er bekommt Haendler,
 * die es einmal versuchen und danach wieder von Hand inserieren.
 *
 * Deshalb steht hier eine Liste bekannter Schreibweisen in allen drei Sprachen.
 * Was nicht erkannt wird, gilt als Fehler mit Angabe der Zeile; geraten wird
 * nichts.
 */

import {
  BODY_VALUES, COLOR_VALUES, CUSTOMS_VALUES, DRIVE_VALUES, EMISSION_VALUES,
  FUEL_VALUES, PLATE_VALUES, TRANSMISSION_VALUES,
} from '@/features/search/schema';

/** Die Felder, die der Import kennt. */
export const IMPORT_FIELDS = [
  'brand', 'model', 'variant',
  'year', 'month', 'mileage', 'fuel', 'transmission', 'power', 'powerUnit',
  'body', 'drive', 'doors', 'seats', 'displacement', 'color',
  'emission', 'consumption',
  'condition', 'accidentFree', 'serviceHistory', 'owners', 'vin',
  'customs', 'plates', 'steering',
  'price', 'negotiable',
  'city', 'postalCode',
  'description', 'images',
] as const;

export type ImportField = (typeof IMPORT_FIELDS)[number];

/**
 * Bekannte Spaltennamen. Verglichen wird kleingeschrieben und ohne
 * Sonderzeichen, damit "Çmimi", "cmimi" und "CMIMI " dasselbe treffen.
 */
const HEADER_ALIASES: Record<ImportField, string[]> = {
  brand: ['marka', 'brand', 'make', 'marke', 'hersteller', 'prodhuesi'],
  model: ['modeli', 'model', 'modell', 'tipi'],
  variant: ['varianti', 'variant', 'version', 'ausstattung', 'versioni', 'trim'],
  year: ['viti', 'vitiprodhimit', 'year', 'baujahr', 'jahr', 'erstzulassung', 'ez'],
  month: ['muaji', 'month', 'monat'],
  mileage: ['kilometrazhi', 'km', 'kilometra', 'mileage', 'kilometerstand', 'laufleistung', 'kilometer'],
  fuel: ['karburanti', 'fuel', 'kraftstoff', 'treibstoff', 'lloji', 'fueltype'],
  transmission: ['transmisioni', 'transmission', 'gearbox', 'getriebe', 'schaltung', 'marshi'],
  power: ['fuqia', 'power', 'ps', 'hp', 'kw', 'leistung', 'kuajfuqi', 'kuaj'],
  powerUnit: ['njesiafuqise', 'powerunit', 'leistungseinheit'],
  body: ['karoseria', 'body', 'bodytype', 'karosserie', 'aufbau', 'forma'],
  drive: ['terheqja', 'drive', 'drivetype', 'antrieb', 'traktioni'],
  doors: ['dyert', 'doors', 'tueren', 'turen', 'anzahlturen'],
  seats: ['uleset', 'seats', 'sitze', 'sitzplatze', 'vende'],
  displacement: ['kubikazha', 'displacement', 'hubraum', 'ccm', 'motori'],
  color: ['ngjyra', 'color', 'colour', 'farbe', 'aussenfarbe'],
  emission: ['euro', 'emission', 'emissionclass', 'abgasnorm', 'normaeuro'],
  consumption: ['konsumi', 'consumption', 'verbrauch', 'harxhimi'],
  condition: ['gjendja', 'condition', 'zustand'],
  accidentFree: ['paaksident', 'accidentfree', 'unfallfrei', 'painteres', 'pademtim'],
  serviceHistory: ['historikuiservisit', 'servicehistory', 'scheckheft', 'servicehistorie', 'servisi'],
  owners: ['pronare', 'owners', 'vorbesitzer', 'halter', 'numriipronareve'],
  vin: ['vin', 'numriishasise', 'shasia', 'fahrgestellnummer', 'fin', 'chassis'],
  customs: ['dogana', 'customs', 'zoll', 'zollstatus', 'customsstatus', 'zhdoganimi'],
  plates: ['targat', 'plates', 'plateorigin', 'kennzeichen', 'targa'],
  steering: ['timoni', 'steering', 'lenkung', 'steeringside'],
  price: ['cmimi', 'price', 'preis', 'vkpreis', 'verkaufspreis'],
  negotiable: ['inegociueshem', 'negotiable', 'verhandelbar', 'vb', 'diskutueshem'],
  city: ['qyteti', 'city', 'stadt', 'ort', 'vendndodhja', 'location'],
  postalCode: ['kodipostar', 'postalcode', 'zip', 'plz', 'postleitzahl'],
  description: ['pershkrimi', 'description', 'beschreibung', 'text', 'detajet'],
  images: ['fotot', 'fotografite', 'images', 'photos', 'bilder', 'fotos', 'imageurls', 'foto'],
};

/** Kleinschreibung ohne Sonderzeichen — "Çmimi (€)" wird zu "cmimi". */
export function normalizeHeader(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFD')
    // Kombinierende Zeichen entfernen: aus "ë" wird "e", aus "ç" wird "c".
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

export type ColumnMap = Partial<Record<ImportField, number>>;

/**
 * Ordnet jeder bekannten Spalte ihre Position in der Datei zu.
 *
 * Die erste passende Spalte gewinnt. Doppelte Spalten kommen vor, wenn ein
 * Export sowohl "PS" als auch "kW" enthaelt -- dann zaehlt die linke, und die
 * Einheit klaert sich ueber den Wert selbst.
 */
export function mapColumns(header: string[]): { columns: ColumnMap; unknown: string[] } {
  const columns: ColumnMap = {};
  const unknown: string[] = [];

  header.forEach((raw, index) => {
    const name = normalizeHeader(raw);
    if (name === '') return;

    const treffer = (Object.keys(HEADER_ALIASES) as ImportField[]).find(
      (field) => HEADER_ALIASES[field].includes(name),
    );

    if (!treffer) {
      unknown.push(raw);
      return;
    }

    if (columns[treffer] === undefined) columns[treffer] = index;
  });

  return { columns, unknown };
}

// ---------------------------------------------------------------------------
// Werte
// ---------------------------------------------------------------------------

/**
 * Zahl aus einem Feld, wie Menschen sie schreiben.
 *
 * "18.000", "18,000", "18 000", "18.000 €", "150 PS" -- alles dasselbe. Der
 * Punkt ist dabei der heikle Fall: im deutschen Excel trennt er Tausender, im
 * englischen die Nachkommastellen. Entschieden wird an der Stellenzahl danach:
 * genau drei Stellen heisst Tausendertrennung.
 */
export function parseNumber(raw: string): number | null {
  const text = raw.trim();
  if (text === '') return null;

  // Alles ausser Ziffern, Trennzeichen und Vorzeichen weg.
  let rest = text.replace(/[^\d.,-]/g, '');
  if (rest === '') return null;

  const punkt = rest.lastIndexOf('.');
  const komma = rest.lastIndexOf(',');

  if (punkt >= 0 && komma >= 0) {
    // Beide vorhanden: das hintere ist das Dezimaltrennzeichen.
    if (punkt > komma) rest = rest.replace(/,/g, '');
    else rest = rest.replace(/\./g, '').replace(',', '.');
  } else if (komma >= 0) {
    const nachkomma = rest.length - komma - 1;
    rest = nachkomma === 3 ? rest.replace(/,/g, '') : rest.replace(',', '.');
  } else if (punkt >= 0) {
    const nachpunkt = rest.length - punkt - 1;
    if (nachpunkt === 3) rest = rest.replace(/\./g, '');
  }

  const zahl = Number(rest);
  return Number.isFinite(zahl) ? zahl : null;
}

/** Vergleichsform eines Feldwerts: klein, ohne Sonderzeichen. */
function schluessel(raw: string): string {
  return normalizeHeader(raw);
}

/**
 * Baut aus einer Zuordnung von Wortlisten eine Erkennungsfunktion.
 *
 * Geprueft wird zuerst auf genaue Gleichheit, danach auf Enthaltensein. Ohne
 * die zweite Stufe scheitert "Diesel Automatik" in einer Kraftstoffspalte; mit
 * ihr wuerde aber "Benzin" auch in "Benzin/Elektro" treffen, weshalb die
 * genaue Uebereinstimmung Vorrang hat.
 */
function erkenner<T extends string>(
  erlaubt: readonly T[],
  woerter: Record<T, string[]>,
): (raw: string) => T | null {
  return (raw: string) => {
    const wert = schluessel(raw);
    if (wert === '') return null;

    // Eigene Kennung, direkt aus einem frueheren Export von LEVIZ.
    const eigen = erlaubt.find((option) => schluessel(option) === wert);
    if (eigen) return eigen;

    for (const option of erlaubt) {
      if (woerter[option].some((wort) => wort === wert)) return option;
    }

    for (const option of erlaubt) {
      if (woerter[option].some((wort) => wert.includes(wort))) return option;
    }

    return null;
  };
}

export const parseFuel = erkenner(FUEL_VALUES, {
  // Die zusammengesetzten Arten stehen bewusst vorn in der Liste der Optionen
  // -- FUEL_VALUES beginnt mit PETROL, deshalb faengt die Pruefung auf genaue
  // Gleichheit die Hybride ab, bevor "benzin" in "hybridbenzin" trifft.
  PETROL: ['benzine', 'benzin', 'petrol', 'gasoline', 'ottokraftstoff'],
  DIESEL: ['nafte', 'diesel', 'dizel'],
  LPG: ['lpg', 'gaz', 'autogas', 'fluessiggas', 'flussiggas'],
  CNG: ['cng', 'erdgas', 'gaznatyror'],
  HYBRID_PETROL: ['hibridbenzine', 'hybridbenzin', 'hybridpetrol', 'hibrid', 'hybrid'],
  HYBRID_DIESEL: ['hibridnafte', 'hybriddiesel', 'hibriddizel'],
  PLUGIN_HYBRID: ['pluginhybrid', 'plugin', 'phev', 'hibridprize'],
  ELECTRIC: ['elektrik', 'elektro', 'electric', 'ev', 'elektrisch'],
  HYDROGEN: ['hidrogjen', 'wasserstoff', 'hydrogen'],
  OTHER: ['tjeter', 'sonstige', 'andere', 'other'],
});

export const parseTransmission = erkenner(TRANSMISSION_VALUES, {
  MANUAL: ['manual', 'manuale', 'manuell', 'handschaltung', 'schaltgetriebe', 'meduar', 'mekanik'],
  AUTOMATIC: ['automatik', 'automatic', 'automatike', 'automat', 'dsg', 'tiptronic', 'steptronic'],
  SEMI_AUTOMATIC: ['gjysmeautomatik', 'halbautomatik', 'semiautomatic', 'automatisiert'],
});

export const parseBody = erkenner(BODY_VALUES, {
  SEDAN: ['sedan', 'limuzine', 'limousine', 'berline'],
  ESTATE: ['karavan', 'kombi', 'estate', 'station', 'stationwagon', 'touring', 'variant', 'avant'],
  HATCHBACK: ['hatchback', 'fliessheck', 'fliessheck', 'schraghack', 'kompakt'],
  SUV: ['suv', 'xhip', 'jeep', 'gelandewagen', 'offroad', 'crossover'],
  COUPE: ['kupe', 'coupe'],
  CONVERTIBLE: ['kabriolet', 'cabrio', 'convertible', 'roadster'],
  VAN: ['furgon', 'van', 'transporter', 'kastenwagen', 'minivan'],
  PICKUP: ['pickup', 'pritschenwagen', 'doppelkabine'],
  MINIBUS: ['minibus', 'kleinbus', 'bus'],
  TRUCK: ['kamion', 'lkw', 'truck', 'lastwagen'],
  CHASSIS: ['shasi', 'fahrgestell', 'chassis'],
  OTHER: ['tjeter', 'sonstige', 'other'],
});

export const parseDrive = erkenner(DRIVE_VALUES, {
  FWD: ['fwd', 'para', 'vorderrad', 'frontantrieb', 'frontwheel'],
  RWD: ['rwd', 'prapa', 'hinterrad', 'heckantrieb', 'rearwheel'],
  AWD: ['awd', 'quattro', 'xdrive', '4motion', 'allrad', '4x4', '4wd', 'katerrota'],
});

export const parseCustoms = erkenner(CUSTOMS_VALUES, {
  CLEARED: ['zhdoganuar', 'ezhdoganuar', 'verzollt', 'cleared', 'customscleared', 'po', 'ja', 'yes'],
  NOT_CLEARED: ['pazhdoganuar', 'epazhdoganuar', 'unverzollt', 'notcleared', 'jo', 'nein', 'no'],
  NOT_APPLICABLE: ['pavlere', 'nichtzutreffend', 'notapplicable', 'na'],
});

export const parsePlates = erkenner(PLATE_VALUES, {
  RKS: ['rks', 'ks', 'kosove', 'kosovo', 'kosova'],
  AL: ['al', 'shqiperi', 'shqiperia', 'albanien', 'albania'],
  MK: ['mk', 'maqedoni', 'maqedonia', 'mazedonien', 'macedonia'],
  FOREIGN: ['tehuaja', 'ausland', 'auslandisch', 'foreign', 'huaj'],
  NONE: ['patarga', 'ohne', 'keine', 'none', 'pa'],
});

export const parseColor = erkenner(COLOR_VALUES, {
  black: ['ezeze', 'zi', 'schwarz', 'black'],
  white: ['bardhe', 'ebardhe', 'weiss', 'weis', 'white'],
  grey: ['gri', 'grau', 'grey', 'gray'],
  silver: ['argjend', 'silber', 'silver'],
  blue: ['kalter', 'blu', 'blau', 'blue'],
  red: ['kuqe', 'ekuqe', 'rot', 'red'],
  brown: ['kafe', 'braun', 'brown'],
  beige: ['bezhe', 'beige'],
  green: ['gjelber', 'egjelber', 'grun', 'grune', 'green'],
  orange: ['portokalli', 'orange'],
});

export const parseEmission = erkenner(EMISSION_VALUES, {
  EURO_1: ['euro1'],
  EURO_2: ['euro2'],
  EURO_3: ['euro3'],
  EURO_4: ['euro4'],
  EURO_5: ['euro5'],
  EURO_6: ['euro6'],
  EURO_6D: ['euro6d'],
  NONE: ['pa', 'keine', 'none'],
});

const JA = ['po', 'yes', 'ja', 'true', '1', 'x', 'wahr', 'e vertete', 'evertete'];
const NEIN = ['jo', 'no', 'nein', 'false', '0', 'falsch'];

/** `null`, wenn das Feld leer ist oder nichts Erkennbares enthaelt. */
export function parseBoolean(raw: string): boolean | null {
  const wert = schluessel(raw);
  if (wert === '') return null;
  if (JA.includes(wert)) return true;
  if (NEIN.includes(wert)) return false;
  return null;
}

/**
 * Baujahr und Monat aus einem Feld.
 *
 * "2018", "03/2018", "2018-03" und "März 2018" kommen alle vor. Ein Monat ohne
 * Jahr ergibt nichts -- das Jahr ist Pflicht.
 */
export function parseYearMonth(raw: string): { year: number; month: number } | null {
  const text = raw.trim();
  if (text === '') return null;

  const zahlen = text.match(/\d+/g);
  if (!zahlen) return null;

  const jahr = zahlen.map(Number).find((zahl) => zahl >= 1950 && zahl <= 2100);
  if (jahr === undefined) return null;

  const monat = zahlen.map(Number).find((zahl) => zahl >= 1 && zahl <= 12);

  return { year: jahr, month: monat ?? 1 };
}

/**
 * Leistung in Kilowatt.
 *
 * Steht die Einheit im Feld, gilt sie. Steht sie nicht da, entscheidet die
 * Spaltenueberschrift. Ist auch die stumm, wird PS angenommen: Haendler in der
 * Region schreiben ihre Leistung in PS, und die Zahl 150 als Kilowatt zu lesen
 * ergaebe ein Fahrzeug mit 204 PS.
 */
export function parsePowerKw(raw: string, headerName?: string): number | null {
  const zahl = parseNumber(raw);
  if (zahl === null || zahl <= 0) return null;

  const feld = schluessel(raw);
  const spalte = headerName ? normalizeHeader(headerName) : '';

  const istKw = feld.includes('kw') || (!feld.includes('ps') && !feld.includes('hp') && spalte === 'kw');

  return istKw ? Math.round(zahl) : Math.round(zahl / 1.35962);
}

/**
 * Bildadressen aus einem Feld.
 *
 * Getrennt wird an senkrechtem Strich, Semikolon, Komma und Leerraum. In einer
 * Adresse selbst kommt keines dieser Zeichen unmaskiert vor.
 */
export function parseImageUrls(raw: string): string[] {
  return raw
    .split(/[|;,\s]+/)
    .map((eintrag) => eintrag.trim())
    .filter((eintrag) => eintrag !== '');
}
