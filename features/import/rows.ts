/**
 * Eine Zeile der Haendlerdatei wird zu dem, was der Inserats-Assistent auch
 * bekommen wuerde.
 *
 * Bewusst ohne Datenbankzugriff: was hier entsteht, sind Namen ("BMW", "320d",
 * "Prishtinë"). Sie in Kennungen aufzuloesen ist Sache des Aufrufers. So bleibt
 * die Uebersetzung der Datei pruefbar, ohne dass ein Test eine Datenbank
 * braucht.
 */

import type { CsvRow } from './csv';
import {
  mapColumns, parseBody, parseBoolean, parseColor, parseCustoms, parseDrive,
  parseEmission, parseFuel, parseImageUrls, parseNumber, parsePlates,
  parsePowerKw, parseTransmission, parseYearMonth, type ColumnMap,
  type ImportField,
} from './columns';

export type ProblemCode =
  | 'missing'
  | 'invalid'
  | 'tooLow'
  | 'tooHigh'
  | 'noImages';

export type RowProblem = { field: ImportField; code: ProblemCode };

export type PreparedRow = {
  line: number;
  /** Namen, wie sie in der Datei stehen — der Aufrufer loest sie auf. */
  brandName: string;
  modelName: string;
  cityName: string;
  values: {
    variant?: string;
    registrationYear: number;
    registrationMonth: number;
    mileageKm: number;
    fuel: string;
    transmission: string;
    powerKw: number;
    bodyType: string;
    driveType?: string;
    doors?: number;
    seats?: number;
    displacementCcm?: number;
    color?: string;
    emissionClass?: string;
    consumptionCombined?: number;
    condition: 'NEW' | 'USED';
    accidentFree: boolean;
    serviceHistory: boolean;
    ownersCount?: number;
    vin?: string;
    customsStatus: string;
    plateOrigin: string;
    steeringSide: 'LEFT' | 'RIGHT';
    priceEur: number;
    negotiable: boolean;
    postalCode?: string;
    description: string;
  } | null;
  imageUrls: string[];
  /** Wurde die Beschreibung aus den Angaben der Zeile gebildet? */
  descriptionGenerated: boolean;
  problems: RowProblem[];
};

/** Die Mindestlaenge, die auch der Assistent verlangt. */
const MIN_DESCRIPTION = 40;

const CURRENT_YEAR = new Date().getFullYear();

function zelle(row: CsvRow, columns: ColumnMap, field: ImportField): string {
  const index = columns[field];
  if (index === undefined) return '';
  return row.cells[index] ?? '';
}

/**
 * Beschreibung aus den Angaben der Zeile.
 *
 * Kein erfundener Werbetext: es sind dieselben Zahlen, die zwei Zeilen weiter
 * oben schon in der Tabelle stehen, nur als Satz. Ein Haendler, der vierzig
 * Autos einliest, schreibt keine vierzig Texte -- und ein Inserat ohne jede
 * Beschreibung wirkt auf Kaeufer wie ein halb fertiges.
 *
 * Im Vorschau-Schritt steht bei jeder so entstandenen Zeile ein Hinweis, damit
 * der Haendler weiss, wo er nacharbeiten sollte.
 */
export function describeFromRow(
  parts: {
    brand: string;
    model: string;
    variant?: string;
    year: number;
    mileageKm: number;
    fuelLabel: string;
    transmissionLabel: string;
    powerHp: number;
  },
  labels: {
    km: string;
    hp: string;
    year: string;
  },
): string {
  const kopf = [parts.brand, parts.model, parts.variant].filter(Boolean).join(' ');

  return [
    kopf,
    `${labels.year} ${parts.year}`,
    `${parts.mileageKm.toLocaleString('de-DE')} ${labels.km}`,
    parts.fuelLabel,
    parts.transmissionLabel,
    `${parts.powerHp} ${labels.hp}`,
  ].join(' · ');
}

export type PrepareOptions = {
  /** Beschreibung aus den Zeilenangaben bilden, wenn sie fehlt oder zu kurz ist. */
  generateDescription: boolean;
  /** Beschriftungen für die gebildete Beschreibung, in der Sprache des Händlers. */
  describe: (parts: {
    brand: string;
    model: string;
    variant?: string;
    year: number;
    mileageKm: number;
    fuel: string;
    transmission: string;
    powerKw: number;
  }) => string;
};

export function prepareRow(
  row: CsvRow,
  columns: ColumnMap,
  header: string[],
  options: PrepareOptions,
): PreparedRow {
  const problems: RowProblem[] = [];
  const lies = (field: ImportField) => zelle(row, columns, field);

  const brandName = lies('brand');
  const modelName = lies('model');
  const cityName = lies('city');

  if (brandName === '') problems.push({ field: 'brand', code: 'missing' });
  if (modelName === '') problems.push({ field: 'model', code: 'missing' });
  if (cityName === '') problems.push({ field: 'city', code: 'missing' });

  const zeit = parseYearMonth(lies('year'));
  if (!zeit) problems.push({ field: 'year', code: lies('year') === '' ? 'missing' : 'invalid' });
  else if (zeit.year > CURRENT_YEAR + 1) problems.push({ field: 'year', code: 'tooHigh' });

  const km = parseNumber(lies('mileage'));
  if (km === null) problems.push({ field: 'mileage', code: lies('mileage') === '' ? 'missing' : 'invalid' });
  else if (km < 0) problems.push({ field: 'mileage', code: 'tooLow' });
  else if (km > 1_500_000) problems.push({ field: 'mileage', code: 'tooHigh' });

  const fuel = parseFuel(lies('fuel'));
  if (!fuel) problems.push({ field: 'fuel', code: lies('fuel') === '' ? 'missing' : 'invalid' });

  const transmission = parseTransmission(lies('transmission'));
  if (!transmission) {
    problems.push({ field: 'transmission', code: lies('transmission') === '' ? 'missing' : 'invalid' });
  }

  const headerName = columns.power !== undefined ? header[columns.power] : undefined;
  const powerKw = parsePowerKw(lies('power'), headerName);
  if (powerKw === null) problems.push({ field: 'power', code: lies('power') === '' ? 'missing' : 'invalid' });
  else if (powerKw > 1500) problems.push({ field: 'power', code: 'tooHigh' });

  const bodyType = parseBody(lies('body'));
  if (!bodyType) problems.push({ field: 'body', code: lies('body') === '' ? 'missing' : 'invalid' });

  const priceEur = parseNumber(lies('price'));
  if (priceEur === null) problems.push({ field: 'price', code: lies('price') === '' ? 'missing' : 'invalid' });
  else if (priceEur < 100) problems.push({ field: 'price', code: 'tooLow' });
  else if (priceEur > 2_000_000) problems.push({ field: 'price', code: 'tooHigh' });

  const imageUrls = parseImageUrls(lies('images'));
  if (imageUrls.length === 0) problems.push({ field: 'images', code: 'noImages' });

  // Ab hier stehen nur noch Angaben, die fehlen duerfen.
  const variant = lies('variant') || undefined;
  const vinRoh = lies('vin').toUpperCase().replace(/\s/g, '');
  const vin = vinRoh.length === 17 ? vinRoh : undefined;
  if (vinRoh !== '' && vin === undefined) problems.push({ field: 'vin', code: 'invalid' });

  const ganzzahl = (field: ImportField): number | undefined => {
    const zahl = parseNumber(lies(field));
    return zahl !== null && zahl >= 0 ? Math.round(zahl) : undefined;
  };

  const verbrauch = parseNumber(lies('consumption'));
  const zustand = lies('condition').toLowerCase();

  const werte =
    problems.length === 0 && zeit && km !== null && fuel && transmission
      && powerKw !== null && bodyType && priceEur !== null
      ? {
          variant,
          registrationYear: zeit.year,
          registrationMonth: zeit.month,
          mileageKm: Math.round(km),
          fuel,
          transmission,
          powerKw,
          bodyType,
          driveType: parseDrive(lies('drive')) ?? undefined,
          doors: ganzzahl('doors'),
          seats: ganzzahl('seats'),
          displacementCcm: ganzzahl('displacement'),
          color: parseColor(lies('color')) ?? undefined,
          emissionClass: parseEmission(lies('emission')) ?? undefined,
          consumptionCombined:
            verbrauch !== null && verbrauch > 0 && verbrauch <= 60 ? verbrauch : undefined,
          condition: (zustand.includes('new') || zustand.includes('neu') || zustand.includes('ri')
            ? 'NEW'
            : 'USED') as 'NEW' | 'USED',
          // Fehlt die Angabe, gilt der guenstigere Fall nicht automatisch:
          // "unfallfrei" ist eine Zusicherung und wird nur uebernommen, wenn
          // sie in der Datei steht.
          accidentFree: parseBoolean(lies('accidentFree')) ?? false,
          serviceHistory: parseBoolean(lies('serviceHistory')) ?? false,
          ownersCount: ganzzahl('owners'),
          vin,
          customsStatus: parseCustoms(lies('customs')) ?? 'CLEARED',
          plateOrigin: parsePlates(lies('plates')) ?? 'RKS',
          steeringSide: 'LEFT' as const,
          priceEur: Math.round(priceEur),
          negotiable: parseBoolean(lies('negotiable')) ?? false,
          postalCode: lies('postalCode') || undefined,
          description: '',
        }
      : null;

  let descriptionGenerated = false;

  if (werte) {
    const roh = lies('description').trim();

    if (roh.length >= MIN_DESCRIPTION) {
      werte.description = roh.slice(0, 6000);
    } else if (options.generateDescription) {
      werte.description = options.describe({
        brand: brandName,
        model: modelName,
        variant,
        year: werte.registrationYear,
        mileageKm: werte.mileageKm,
        fuel: werte.fuel,
        transmission: werte.transmission,
        powerKw: werte.powerKw,
      });
      descriptionGenerated = true;
    } else {
      problems.push({ field: 'description', code: roh === '' ? 'missing' : 'tooLow' });
    }
  }

  return {
    line: row.line,
    brandName,
    modelName,
    cityName,
    values: problems.length === 0 ? werte : null,
    imageUrls,
    descriptionGenerated,
    problems,
  };
}

export type PreparedFile = {
  columns: ColumnMap;
  unknownColumns: string[];
  missingColumns: ImportField[];
  rows: PreparedRow[];
};

/** Spalten, ohne die kein Inserat entstehen kann. */
export const REQUIRED_COLUMNS: ImportField[] = [
  'brand', 'model', 'year', 'mileage', 'fuel', 'transmission',
  'power', 'body', 'price', 'city', 'images',
];

export function prepareFile(
  header: string[],
  rows: CsvRow[],
  options: PrepareOptions,
): PreparedFile {
  const { columns, unknown } = mapColumns(header);
  const missing = REQUIRED_COLUMNS.filter((field) => columns[field] === undefined);

  return {
    columns,
    unknownColumns: unknown,
    missingColumns: missing,
    // Fehlt eine Pflichtspalte, waere jede Zeile derselbe Fehler. Der Haendler
    // soll einmal lesen, was fehlt, und nicht vierzigmal.
    rows: missing.length > 0 ? [] : rows.map((row) => prepareRow(row, columns, header, options)),
  };
}
