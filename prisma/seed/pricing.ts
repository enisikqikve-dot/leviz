import type { BodyType, CustomsStatus, FuelType } from '@/lib/generated/prisma/enums';

export type BrandTier = 'budget' | 'mainstream' | 'premium' | 'luxury';

const TIER_BY_BRAND: Record<string, BrandTier> = {
  dacia: 'budget', fiat: 'budget', chevrolet: 'budget',
  audi: 'premium', bmw: 'premium', 'mercedes-benz': 'premium',
  volvo: 'premium', mini: 'premium', 'alfa-romeo': 'premium',
  porsche: 'luxury', 'land-rover': 'luxury', jaguar: 'luxury',
  lexus: 'luxury',
  // Ein Model 3 liegt neu bei rund 45.000 Euro und gehoert nicht in dieselbe
  // Klasse wie ein Range Rover, darum premium statt luxury.
  tesla: 'premium',
};

export function brandTier(slug: string): BrandTier {
  return TIER_BY_BRAND[slug] ?? 'mainstream';
}

/** Neupreis in Euro, grob nach Segment. Grundlage der Wertentwicklung. */
const BASE_NEW: Record<BrandTier, Partial<Record<BodyType, number>>> = {
  budget: { HATCHBACK: 14000, SEDAN: 16000, ESTATE: 17000, SUV: 20000, VAN: 18000 },
  mainstream: {
    HATCHBACK: 25000, SEDAN: 31000, ESTATE: 33000, SUV: 36000, COUPE: 34000,
    CONVERTIBLE: 38000, VAN: 31000, PICKUP: 37000, MINIBUS: 44000, TRUCK: 62000,
    CHASSIS: 40000, OTHER: 25000,
  },
  premium: {
    HATCHBACK: 36000, SEDAN: 49000, ESTATE: 52000, SUV: 59000, COUPE: 56000,
    CONVERTIBLE: 62000, VAN: 42000, PICKUP: 50000, MINIBUS: 55000, TRUCK: 70000,
    CHASSIS: 50000, OTHER: 40000,
  },
  luxury: {
    HATCHBACK: 45000, SEDAN: 95000, ESTATE: 80000, SUV: 88000, COUPE: 110000,
    CONVERTIBLE: 120000, VAN: 60000, PICKUP: 65000, MINIBUS: 70000, TRUCK: 90000,
    CHASSIS: 60000, OTHER: 60000,
  },
};

/** Aufschlag oder Abschlag nach Antriebsart. */
const FUEL_FACTOR: Partial<Record<FuelType, number>> = {
  ELECTRIC: 1.15,
  PLUGIN_HYBRID: 1.12,
  HYBRID_PETROL: 1.08,
  HYBRID_DIESEL: 1.05,
  DIESEL: 1.0,
  PETROL: 0.96,
  LPG: 0.9,
  CNG: 0.9,
};

export type PriceInput = {
  brandSlug: string;
  bodyType: BodyType;
  fuel: FuelType;
  year: number;
  mileageKm: number;
  currentYear: number;
  customsStatus: CustomsStatus;
  accidentFree: boolean;
  serviceHistory: boolean;
  /** Zufallsfaktor zwischen -1 und 1 fuer die Streuung am Markt. */
  noise: number;
};

/**
 * Preisberechnung fuer die Beispieldaten.
 *
 * Kalibriert am regionalen Markt: Ein VW Golf 2.0 TDI von 2014 mit 190.000 km
 * landet damit bei rund 7.000 bis 8.000 Euro — die Groessenordnung, die im
 * Kosovo tatsaechlich aufgerufen wird.
 */
export function estimatePriceCents(input: PriceInput): number {
  const tier = brandTier(input.brandSlug);
  const base = BASE_NEW[tier][input.bodyType] ?? BASE_NEW[tier].SEDAN ?? 25000;

  const age = Math.max(0, input.currentYear - input.year);

  // Starker Wertverlust in den ersten drei Jahren, danach flacher.
  const depreciation = 0.85 ** Math.min(age, 3) * 0.9 ** Math.max(0, age - 3);

  // Abweichung von der erwarteten Laufleistung wirkt auf den Preis.
  const expectedKm = age * 15000;
  const excessKm = input.mileageKm - expectedKm;
  const mileageFactor = Math.max(0.6, 1 - (excessKm / 10000) * 0.012);

  const fuelFactor = FUEL_FACTOR[input.fuel] ?? 1;
  const conditionFactor =
    (input.accidentFree ? 1 : 0.86) * (input.serviceHistory ? 1.04 : 0.96);

  // Unverzollte Fahrzeuge sind guenstiger, weil der Kaeufer den Zoll traegt.
  const customsFactor = input.customsStatus === 'NOT_CLEARED' ? 0.75 : 1;

  const noiseFactor = 1 + input.noise * 0.12;

  const value =
    base * depreciation * mileageFactor * fuelFactor * conditionFactor *
    customsFactor * noiseFactor;

  // Untergrenze, damit kein Fahrzeug unrealistisch billig wird.
  const floored = Math.max(700, value);

  // Auf 50 Euro runden, wie es Verkaeufer in der Praxis tun.
  return Math.round(floored / 50) * 50 * 100;
}
