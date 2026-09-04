import { z } from 'zod';

import {
  BODY_VALUES, COLOR_VALUES, CUSTOMS_VALUES, DRIVE_VALUES, EMISSION_VALUES,
  FUEL_VALUES, PLATE_VALUES, TRANSMISSION_VALUES,
} from '@/features/search/schema';

const CURRENT_YEAR = new Date().getFullYear();

const optionalNumber = z.coerce.number().int().nonnegative().optional();

/** Schritt 1: Um welches Fahrzeug geht es. */
export const stepVehicleSchema = z.object({
  category: z.enum(['CAR', 'VAN_TRUCK', 'MOTORCYCLE', 'CAMPER_TRAILER']).default('CAR'),
  brandSlug: z.string().min(1, 'Zgjidh markën'),
  modelSlug: z.string().min(1, 'Zgjidh modelin'),
  variant: z.string().trim().max(80).optional(),
});

/** Schritt 2: Technische Eckdaten. */
export const stepTechnicalSchema = z.object({
  registrationYear: z.coerce
    .number()
    .int()
    .min(1950, 'Viti është shumë i hershëm')
    .max(CURRENT_YEAR + 1, 'Viti është në të ardhmen'),
  registrationMonth: z.coerce.number().int().min(1).max(12).default(1),
  mileageKm: z.coerce
    .number()
    .int()
    .min(0)
    .max(1_500_000, 'Kilometrazhi është i pabesueshëm'),
  fuel: z.enum(FUEL_VALUES),
  transmission: z.enum(TRANSMISSION_VALUES),
  powerKw: z.coerce.number().int().min(1).max(1500),
  bodyType: z.enum(BODY_VALUES),
  driveType: z.enum(DRIVE_VALUES).optional(),
  doors: optionalNumber,
  seats: optionalNumber,
  displacementCcm: optionalNumber,
  color: z.enum(COLOR_VALUES).optional(),
  interiorColor: z.enum(COLOR_VALUES).optional(),
  emissionClass: z.enum(EMISSION_VALUES).optional(),
  co2Gkm: optionalNumber,
  consumptionCombined: z.coerce.number().min(0).max(60).optional(),
  electricRangeKm: optionalNumber,
  batteryCapacityKwh: z.coerce.number().min(0).max(300).optional(),
});

/**
 * Schritt 3: Zustand und die Angaben des Importmarkts. Zoll und Kennzeichen
 * stehen hier gleichberechtigt neben Unfallfreiheit und Servicehistorie — im
 * Kosovo und in Albanien sind sie genauso kaufentscheidend.
 */
export const stepConditionSchema = z.object({
  condition: z.enum(['NEW', 'USED']).default('USED'),
  accidentFree: z.boolean().default(true),
  serviceHistory: z.boolean().default(false),
  warrantyMonths: optionalNumber,
  ownersCount: optionalNumber,
  vin: z.string().trim().length(17, 'Numri i shasisë ka 17 karaktere').optional().or(z.literal('')),
  customsStatus: z.enum(CUSTOMS_VALUES).default('CLEARED'),
  plateOrigin: z.enum(PLATE_VALUES).default('RKS'),
  importedFromCode: z.string().trim().max(4).optional().or(z.literal('')),
  registeredUntil: z.string().trim().optional().or(z.literal('')),
  steeringSide: z.enum(['LEFT', 'RIGHT']).default('LEFT'),
});

/** Schritt 4: Ausstattung als Liste von Kennungen. */
export const stepFeaturesSchema = z.object({
  features: z.array(z.string().min(1).max(80)).max(80).default([]),
});

/** Schritt 5: Bilder. Die Reihenfolge bestimmt, welches Bild vorne steht. */
export const stepImagesSchema = z.object({
  images: z
    .array(
      z.object({
        key: z.string().min(1),
        url: z.string().min(1),
      }),
    )
    .min(1, 'Shto së paku një foto')
    .max(30),
});

/** Schritt 6: Preis. Gespeichert wird immer in Euro-Cent. */
export const stepPriceSchema = z.object({
  priceEur: z.coerce
    .number()
    .int()
    .min(100, 'Çmimi është shumë i ulët')
    .max(2_000_000, 'Çmimi është shumë i lartë'),
  negotiable: z.boolean().default(false),
  vatDeductible: z.boolean().default(false),
  financingAvailable: z.boolean().default(false),
  leasingAvailable: z.boolean().default(false),
});

/** Schritt 7: Standort. */
export const stepLocationSchema = z.object({
  citySlug: z.string().min(1, 'Zgjidh qytetin'),
  postalCode: z.string().trim().max(12).optional().or(z.literal('')),
  addressLine: z.string().trim().max(160).optional().or(z.literal('')),
  hideExactAddress: z.boolean().default(true),
});

/** Schritt 8: Beschreibung. */
export const stepDescriptionSchema = z.object({
  description: z
    .string()
    .trim()
    .min(40, 'Përshkrimi është shumë i shkurtër')
    .max(6000),
});

/** Alle Schritte zusammen — das prüft der Server vor dem Speichern. */
export const listingSchema = stepVehicleSchema
  .and(stepTechnicalSchema)
  .and(stepConditionSchema)
  .and(stepFeaturesSchema)
  .and(stepImagesSchema)
  .and(stepPriceSchema)
  .and(stepLocationSchema)
  .and(stepDescriptionSchema);

/** Was der Server nach der Prüfung erhält — Standardwerte sind gesetzt. */
export type ListingInput = z.output<typeof listingSchema>;

/**
 * Was im Formular steht. Felder mit Standardwert dürfen hier fehlen, deshalb
 * unterscheidet sich der Typ von `ListingInput`.
 */
export type ListingFormValues = z.input<typeof listingSchema>;

export const STEPS = [
  'vehicle', 'technical', 'condition', 'features',
  'images', 'price', 'location', 'description', 'preview',
] as const;

export type StepId = (typeof STEPS)[number];

/** Zu jedem Schritt das Schema, das ihn allein prüft. */
export const STEP_SCHEMAS: Partial<Record<StepId, z.ZodType>> = {
  vehicle: stepVehicleSchema,
  technical: stepTechnicalSchema,
  condition: stepConditionSchema,
  features: stepFeaturesSchema,
  images: stepImagesSchema,
  price: stepPriceSchema,
  location: stepLocationSchema,
  description: stepDescriptionSchema,
};
