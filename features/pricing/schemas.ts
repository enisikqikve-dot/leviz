import { z } from 'zod';

/** Älter als das nimmt kein Marktvergleich mehr sinnvoll auf. */
export const OLDEST_YEAR = 1950;

export const MAX_MILEAGE_KM = 2_000_000;

export const valuationSchema = z.object({
  brandSlug: z.string().trim().min(1, 'errorBrand'),
  modelSlug: z.string().trim().min(1, 'errorModel'),

  /**
   * `coerce`, weil ein Zahlenfeld im Browser trotzdem eine Zeichenkette
   * liefert. Die Obergrenze steht im Schema und nicht nur im Feld: das Feld
   * lässt sich im Browser ändern, das Schema nicht.
   */
  year: z.coerce
    .number()
    .int()
    .min(OLDEST_YEAR, 'errorYear')
    .max(new Date().getFullYear() + 1, 'errorYear'),

  mileageKm: z.coerce.number().int().min(0, 'errorMileage').max(MAX_MILEAGE_KM, 'errorMileage'),
});

export type ValuationFormInput = z.input<typeof valuationSchema>;
export type ValuationInput = z.infer<typeof valuationSchema>;
