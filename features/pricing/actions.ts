'use server';

import { fail, fromZod, ok, type ActionResult } from '@/lib/action-result';
import { prisma } from '@/lib/db';
import { RATE_LIMITS, rateLimiter } from '@/lib/rate-limit';
import { getRequestIp } from '@/lib/request-ip';

import type { EstimateResult } from './queries';
import { estimateForVehicle } from './queries';
import { valuationSchema } from './schemas';

export type ValuationResult = EstimateResult & {
  /** Für die Anzeige: was der Nutzer eingegeben hat. */
  brandName: string;
  modelName: string;
};

/**
 * Schätzt den Wert eines Fahrzeugs, das noch gar nicht inseriert ist.
 *
 * Ohne Anmeldung: Wer wissen will, was sein Auto wert ist, steht am Anfang —
 * ein Konto zu verlangen, bevor man eine Zahl sieht, verliert genau die
 * Verkäufer, die man gewinnen will.
 *
 * Gerechnet wird aus laufenden Angeboten, nicht von einem Sprachmodell. Ein
 * Modell würde eine plausibel klingende Zahl erfinden, die niemand nachrechnen
 * kann; hier steht die Anzahl der Vergleichsfahrzeuge im Ergebnis.
 */
export async function estimateForCarAction(input: unknown): Promise<ActionResult<ValuationResult>> {
  const ip = await getRequestIp();
  const { limit, windowMs } = RATE_LIMITS.valuation;

  const attempt = await rateLimiter.check(`valuation:${ip}`, limit, windowMs);
  if (!attempt.success) return fail('errorTooMany');

  const parsed = valuationSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error.issues);

  const model = await prisma.model.findFirst({
    where: { slug: parsed.data.modelSlug, brand: { slug: parsed.data.brandSlug } },
    select: { id: true, name: true, brandId: true, brand: { select: { name: true } } },
  });

  if (!model) return fail('errorModel');

  const estimate = await estimateForVehicle({
    brandId: model.brandId,
    modelId: model.id,
    year: parsed.data.year,
    mileageKm: parsed.data.mileageKm,
  });

  // Kein Ergebnis heisst nicht „Fehler", sondern „zu wenige Vergleiche". Das
  // ist eine Aussage über den Markt und gehört als solche gesagt.
  if (!estimate) return fail('errorTooFew');

  return ok({ ...estimate, brandName: model.brand.name, modelName: model.name });
}
