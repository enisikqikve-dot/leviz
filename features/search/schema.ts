import { z } from 'zod';

/**
 * Alle Filter der Fahrzeugsuche. Sie stehen ausschliesslich in der Adresszeile,
 * damit jede Suche teilbar, verlinkbar und als Suchauftrag speicherbar bleibt.
 */

export const SORT_OPTIONS = [
  'relevance', 'newest', 'priceAsc', 'priceDesc',
  'mileageAsc', 'yearDesc', 'distance',
] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

export const PAGE_SIZE = 24;

/** Kommagetrennte Mehrfachauswahl, etwa fuel=diesel,petrol. */
const list = <T extends readonly [string, ...string[]]>(values: T) =>
  z
    .string()
    .transform((value) => value.split(',').map((entry) => entry.trim()).filter(Boolean))
    .pipe(z.array(z.enum(values)))
    .catch([] as never)
    .optional();

const slugList = z
  .string()
  .transform((value) => value.split(',').map((entry) => entry.trim()).filter(Boolean))
  .pipe(z.array(z.string().min(1).max(80)))
  .catch([])
  .optional();

const positiveInt = z.coerce.number().int().min(0).max(100_000_000).optional().catch(undefined);
const bool = z
  .enum(['1', 'true', 'yes'])
  .transform(() => true)
  .optional()
  .catch(undefined);

export const FUEL_VALUES = [
  'PETROL', 'DIESEL', 'LPG', 'CNG', 'HYBRID_PETROL', 'HYBRID_DIESEL',
  'PLUGIN_HYBRID', 'ELECTRIC', 'HYDROGEN', 'OTHER',
] as const;

export const TRANSMISSION_VALUES = ['MANUAL', 'AUTOMATIC', 'SEMI_AUTOMATIC'] as const;
export const DRIVE_VALUES = ['FWD', 'RWD', 'AWD'] as const;
export const BODY_VALUES = [
  'SEDAN', 'ESTATE', 'HATCHBACK', 'SUV', 'COUPE', 'CONVERTIBLE',
  'VAN', 'PICKUP', 'MINIBUS', 'TRUCK', 'CHASSIS', 'OTHER',
] as const;
export const CUSTOMS_VALUES = ['CLEARED', 'NOT_CLEARED', 'NOT_APPLICABLE'] as const;
export const PLATE_VALUES = ['RKS', 'AL', 'MK', 'FOREIGN', 'NONE'] as const;
export const EMISSION_VALUES = [
  'EURO_1', 'EURO_2', 'EURO_3', 'EURO_4', 'EURO_5', 'EURO_6', 'EURO_6D', 'NONE',
] as const;
export const COLOR_VALUES = [
  'black', 'white', 'grey', 'silver', 'blue', 'red', 'brown', 'beige', 'green', 'orange',
] as const;
export const CATEGORY_VALUES = ['CAR', 'VAN_TRUCK', 'MOTORCYCLE', 'CAMPER_TRAILER'] as const;

export const searchSchema = z.object({
  q: z.string().trim().max(120).optional().catch(undefined),

  category: z.enum(CATEGORY_VALUES).optional().catch(undefined),
  make: z.string().trim().max(80).optional().catch(undefined),
  model: z.string().trim().max(80).optional().catch(undefined),

  condition: z.enum(['NEW', 'USED']).optional().catch(undefined),

  priceMin: positiveInt,
  priceMax: positiveInt,
  mileageMin: positiveInt,
  mileageMax: positiveInt,
  yearMin: positiveInt,
  yearMax: positiveInt,
  powerMin: positiveInt,
  powerMax: positiveInt,

  fuel: list(FUEL_VALUES),
  transmission: list(TRANSMISSION_VALUES),
  bodyType: list(BODY_VALUES),
  driveType: list(DRIVE_VALUES),
  emissionClass: list(EMISSION_VALUES),
  color: list(COLOR_VALUES),

  doors: positiveInt,
  seats: positiveInt,
  co2Max: positiveInt,
  rangeMin: positiveInt,

  // Regionale Filter, der eigentliche Unterschied zu westlichen Portalen.
  customs: list(CUSTOMS_VALUES),
  plates: list(PLATE_VALUES),
  importedFrom: slugList,
  steering: z.enum(['LEFT', 'RIGHT']).optional().catch(undefined),

  country: z.string().trim().max(4).optional().catch(undefined),
  city: z.string().trim().max(80).optional().catch(undefined),
  radius: positiveInt,

  sellerType: z.enum(['PRIVATE', 'DEALER']).optional().catch(undefined),
  dealer: z.string().trim().max(80).optional().catch(undefined),

  vat: bool,
  accidentFree: bool,
  serviceHistory: bool,
  warranty: bool,
  financing: bool,
  leasing: bool,

  features: slugList,

  sort: z.enum(SORT_OPTIONS).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(500).optional().catch(undefined),
});

export type SearchParams = z.infer<typeof searchSchema>;

/** Liest die Filter aus den Suchparametern einer Next-Seite. */
export function parseSearchParams(
  input: Record<string, string | string[] | undefined>,
): SearchParams {
  const flat: Record<string, string> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue;
    flat[key] = Array.isArray(value) ? value.join(',') : value;
  }
  return searchSchema.parse(flat);
}

/** Baut aus den Filtern wieder eine Adresszeile — leere Werte fallen weg. */
export function toQueryString(params: Partial<SearchParams>): Record<string, string> {
  const output: Record<string, string> = {};

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      if (value.length > 0) output[key] = value.join(',');
    } else if (typeof value === 'boolean') {
      if (value) output[key] = '1';
    } else {
      output[key] = String(value);
    }
  }

  return output;
}

/** Zaehlt die gesetzten Filter, ohne Sortierung und Seitenzahl. */
export function countActiveFilters(params: SearchParams): number {
  const ignored = new Set(['sort', 'page']);
  return Object.entries(params).filter(([key, value]) => {
    if (ignored.has(key)) return false;
    if (value === undefined || value === null || value === '') return false;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  }).length;
}
