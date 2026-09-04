import type {
  CustomsStatus, DriveType, EmissionClass, PlateOrigin, SteeringSide,
  Transmission, VehicleCondition,
} from '@/lib/generated/prisma/enums';

import type { Random } from './random';

/**
 * Farben als Kennung, nicht als Text — so laesst sich danach filtern und die
 * Beschriftung kommt aus den Uebersetzungsdateien.
 */
export const COLORS = [
  'black', 'white', 'grey', 'silver', 'blue', 'red', 'brown', 'beige', 'green', 'orange',
] as const;

export const INTERIOR_COLORS = ['black', 'beige', 'grey', 'brown'] as const;

/** Haeufigkeit der Aussenfarben im regionalen Bestand. */
export const COLOR_WEIGHTS = [
  { item: 'black' as const, weight: 26 },
  { item: 'white' as const, weight: 20 },
  { item: 'grey' as const, weight: 17 },
  { item: 'silver' as const, weight: 13 },
  { item: 'blue' as const, weight: 10 },
  { item: 'red' as const, weight: 5 },
  { item: 'brown' as const, weight: 4 },
  { item: 'beige' as const, weight: 2 },
  { item: 'green' as const, weight: 2 },
  { item: 'orange' as const, weight: 1 },
];

/**
 * Zollstatus. Rund ein Fuenftel der angebotenen Fahrzeuge ist unverzollt —
 * der Kaeufer traegt dann die Abgaben selbst, dafuer ist der Preis niedriger.
 */
export const CUSTOMS_WEIGHTS = [
  { item: 'CLEARED' as CustomsStatus, weight: 72 },
  { item: 'NOT_CLEARED' as CustomsStatus, weight: 22 },
  { item: 'NOT_APPLICABLE' as CustomsStatus, weight: 6 },
];

/** Herkunft der Kennzeichen im Kosovo und in Albanien. */
export const PLATE_WEIGHTS = [
  { item: 'RKS' as PlateOrigin, weight: 52 },
  { item: 'FOREIGN' as PlateOrigin, weight: 24 },
  { item: 'AL' as PlateOrigin, weight: 13 },
  { item: 'MK' as PlateOrigin, weight: 6 },
  { item: 'NONE' as PlateOrigin, weight: 5 },
];

/** Aus welchen Laendern die Importe stammen. */
export const IMPORT_ORIGIN_WEIGHTS = [
  { item: 'DE', weight: 44 },
  { item: 'CH', weight: 19 },
  { item: 'IT', weight: 12 },
  { item: 'AT', weight: 10 },
  { item: 'BE', weight: 8 },
  { item: 'SI', weight: 4 },
  { item: 'HR', weight: 3 },
];

export function emissionClassFor(year: number): EmissionClass {
  if (year >= 2021) return 'EURO_6D';
  if (year >= 2015) return 'EURO_6';
  if (year >= 2011) return 'EURO_5';
  if (year >= 2006) return 'EURO_4';
  if (year >= 2001) return 'EURO_3';
  return 'EURO_2';
}

/** Antriebsart passend zu Karosserie und Marke. */
export function driveTypeFor(
  random: Random,
  bodyType: string,
  brandSlug: string,
): DriveType {
  if (bodyType === 'SUV' || bodyType === 'PICKUP') {
    return random.chance(0.62) ? 'AWD' : 'FWD';
  }
  if (brandSlug === 'bmw' || brandSlug === 'mercedes-benz') {
    return random.chance(0.55) ? 'RWD' : 'AWD';
  }
  return random.chance(0.92) ? 'FWD' : 'AWD';
}

export function transmissionFor(random: Random, year: number, tier: string): Transmission {
  // Automatikanteil steigt mit Baujahr und Fahrzeugklasse.
  const base = tier === 'premium' || tier === 'luxury' ? 0.6 : 0.28;
  const byYear = Math.min(0.35, Math.max(0, (year - 2010) * 0.025));
  return random.chance(base + byYear) ? 'AUTOMATIC' : 'MANUAL';
}

export function conditionFor(year: number, mileageKm: number): VehicleCondition {
  return year >= 2025 && mileageKm < 2000 ? 'NEW' : 'USED';
}

export function steeringFor(random: Random): SteeringSide {
  // Rechtslenker sind Einzelfaelle aus britischen oder japanischen Importen.
  return random.chance(0.02) ? 'RIGHT' : 'LEFT';
}

import type { SeedBrand, SeedModel } from './brands';
import { buildDescription } from './descriptions';
import { enginesFor } from './engines';
import { brandTier, estimatePriceCents } from './pricing';

export type BuiltVehicle = ReturnType<typeof buildVehicle>;

const CURRENT_YEAR = 2026;

/**
 * Erzeugt einen vollstaendigen, in sich stimmigen Fahrzeugdatensatz. Baujahr,
 * Laufleistung, Preis, Zollstatus und Ausstattung haengen voneinander ab —
 * ein Fahrzeug von 2010 mit 20.000 km und Matrix-LED entsteht so nicht.
 */
export function buildVehicle(
  random: Random,
  brand: SeedBrand,
  model: SeedModel,
  featureSlugs: { slug: string; frequency: number; label: string }[],
) {
  const tier = brandTier(brand.slug);

  // Aeltere Fahrzeuge ueberwiegen; Neuwagen sind die Ausnahme.
  const minYear = Math.max(model.yearFrom ?? 2005, 2005);
  const year = random.normal(2015, 4, minYear, CURRENT_YEAR);
  const age = Math.max(0, CURRENT_YEAR - year);

  // Rund 18.000 km im Jahr, mit deutlicher Streuung nach oben.
  const mileageKm = Math.max(
    500,
    random.normal(age * 18000, Math.max(12000, age * 5000), 500, 480000),
  );

  // Erst die Karosserieform, dann der Motor: nur so laesst sich ausschliessen,
  // dass ein Pickup einen Kleinwagenmotor bekommt.
  const bodyType = random.pick(model.bodyTypes);
  const engine = random.pick(enginesFor(brand.engineStyle, model.slug, bodyType));
  const customsStatus = random.weighted(CUSTOMS_WEIGHTS);
  const plateOrigin = random.weighted(PLATE_WEIGHTS);

  // Importherkunft nur bei tatsaechlich importierten Fahrzeugen.
  const isImported = plateOrigin === 'FOREIGN' || random.chance(0.62);
  const importedFrom = isImported ? random.weighted(IMPORT_ORIGIN_WEIGHTS) : undefined;

  const accidentFree = random.chance(0.82);
  const serviceHistory = random.chance(0.68);

  const priceCents = estimatePriceCents({
    brandSlug: brand.slug,
    bodyType,
    fuel: engine.fuel,
    year,
    mileageKm,
    currentYear: CURRENT_YEAR,
    customsStatus,
    accidentFree,
    serviceHistory,
    noise: random.float(-1, 1, 3),
  });

  // Ausstattung nach Haeufigkeit; neuere Fahrzeuge haben mehr davon.
  const modernity = Math.min(1.4, 0.5 + (year - 2005) / 20);
  const features = featureSlugs.filter((feature) =>
    random.chance(Math.min(0.95, feature.frequency * modernity)),
  );

  const doors = bodyType === 'COUPE' || bodyType === 'CONVERTIBLE'
    ? random.pick([2, 3])
    : bodyType === 'VAN' || bodyType === 'MINIBUS' ? 5 : random.pick([4, 5]);

  const seats = bodyType === 'MINIBUS' ? random.pick([8, 9])
    : bodyType === 'VAN' ? random.pick([5, 7])
    : bodyType === 'COUPE' || bodyType === 'CONVERTIBLE' ? 4 : 5;

  return {
    year,
    mileageKm,
    bodyType,
    fuel: engine.fuel,
    variantName: engine.name,
    powerKw: engine.powerKw,
    displacementCcm: engine.displacementCcm || null,
    transmission: transmissionFor(random, year, tier),
    driveType: driveTypeFor(random, bodyType, brand.slug),
    condition: conditionFor(year, mileageKm),
    steeringSide: steeringFor(random),
    emissionClass: emissionClassFor(year),
    customsStatus,
    plateOrigin,
    importedFrom,
    accidentFree,
    serviceHistory,
    priceCents,
    doors,
    seats,
    cylinders: engine.displacementCcm > 2500 ? 6 : engine.displacementCcm > 0 ? 4 : null,
    color: random.weighted(COLOR_WEIGHTS),
    interiorColor: random.pick(INTERIOR_COLORS),
    co2Gkm: engine.fuel === 'ELECTRIC' ? 0 : random.int(95, 215),
    consumptionCombined: engine.fuel === 'ELECTRIC' ? null : random.float(4.1, 9.8, 1),
    electricRangeKm: engine.fuel === 'ELECTRIC' ? random.int(280, 520) : null,
    batteryCapacityKwh: engine.fuel === 'ELECTRIC' ? random.float(45, 82, 1) : null,
    ownersCount: Math.max(1, Math.round(age / 4) + random.int(0, 2)),
    warrantyMonths: random.chance(0.28) ? random.pick([6, 12, 24]) : null,
    negotiable: random.chance(0.55),
    vatDeductible: random.chance(0.18),
    financingAvailable: random.chance(0.35),
    features,
    buildDescription,
  };
}
