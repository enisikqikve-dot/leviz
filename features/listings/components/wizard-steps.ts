import type { ListingFormValues, StepId } from '@/features/listings/schemas';

/**
 * Welche Felder zu welchem Schritt gehören. Beim Weiterklicken wird nur der
 * aktuelle Schritt geprüft — sonst würde der Assistent Fehler für Felder
 * zeigen, die noch gar nicht dran waren.
 */
export const STEP_FIELDS: Record<StepId, (keyof ListingFormValues)[]> = {
  vehicle: ['category', 'brandSlug', 'modelSlug', 'variant'],
  technical: [
    'registrationYear', 'registrationMonth', 'mileageKm', 'fuel', 'transmission',
    'powerKw', 'bodyType', 'driveType', 'doors', 'seats', 'displacementCcm',
    'color', 'interiorColor', 'emissionClass',
  ],
  condition: [
    'condition', 'accidentFree', 'serviceHistory', 'warrantyMonths', 'ownersCount',
    'vin', 'customsStatus', 'plateOrigin', 'importedFromCode', 'registeredUntil',
    'steeringSide',
  ],
  features: ['features'],
  images: ['images'],
  price: ['priceEur', 'negotiable', 'vatDeductible', 'financingAvailable', 'leasingAvailable'],
  location: ['citySlug', 'postalCode', 'addressLine', 'hideExactAddress'],
  description: ['description'],
  preview: [],
};
