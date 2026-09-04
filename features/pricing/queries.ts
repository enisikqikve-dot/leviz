import { prisma } from '@/lib/db';

import { estimatePrice, MIN_SAMPLE, type PriceEstimate } from './estimate';

export type EstimateRequest = {
  brandId: string;
  modelId: string;
  year: number | null;
  mileageKm: number | null;
  fuel?: string | null;
  bodyType?: string | null;
  /** Wird aus der Vergleichsmenge ausgeschlossen. */
  excludeVehicleId?: string;
};

/** Jahresspanne der zweiten Stufe. Ein 5er von 2008 gehört nicht zu einem von 2022. */
const YEAR_WINDOW = 5;

/**
 * Vergleichsangebote für eine Schätzung.
 *
 * Zwei Stufen, beide eng: erst dasselbe Modell, dann dieselbe Marke mit
 * derselben Karosserieform und ähnlichem Baujahr. Weiter wird nicht geöffnet.
 *
 * Der Grund: Ein 5er gegen alle BMW gerechnet ergibt zwangsläufig „unter dem
 * Marktmittel“, weil X5 und 7er den Schnitt heben. Eine Aussage, die aus einem
 * unpassenden Vergleich stammt, ist für den Käufer schlechter als gar keine.
 */
async function findComparables(request: EstimateRequest) {
  const base = {
    status: 'ACTIVE' as const,
    priceCents: { gt: 0 },
    ...(request.excludeVehicleId ? { id: { not: request.excludeVehicleId } } : {}),
  };

  const select = { priceCents: true, firstRegistration: true, mileageKm: true };

  const sameModel = await prisma.vehicle.findMany({
    where: {
      ...base,
      modelId: request.modelId,
      ...(request.fuel ? { fuel: request.fuel as never } : {}),
    },
    select,
    take: 60,
  });

  if (sameModel.length >= MIN_SAMPLE) return { rows: sameModel, scope: 'model' as const };

  const sameClass = await prisma.vehicle.findMany({
    where: {
      ...base,
      brandId: request.brandId,
      ...(request.bodyType ? { bodyType: request.bodyType as never } : {}),
      ...(request.year
        ? {
            firstRegistration: {
              gte: new Date(request.year - YEAR_WINDOW, 0, 1),
              lte: new Date(request.year + YEAR_WINDOW, 11, 31),
            },
          }
        : {}),
    },
    select,
    take: 60,
  });

  return { rows: sameClass, scope: 'brand' as const };
}

export type EstimateResult = PriceEstimate & {
  /** Woraus die Schätzung stammt: gleiches Modell oder nur gleiche Marke. */
  scope: 'model' | 'brand';
};

/** Schätzt den Marktpreis. `null`, wenn zu wenige Vergleiche vorliegen. */
export async function estimateForVehicle(
  request: EstimateRequest,
): Promise<EstimateResult | null> {
  const { rows, scope } = await findComparables(request);

  const estimate = estimatePrice({
    year: request.year,
    mileageKm: request.mileageKm,
    comparables: rows.map((row) => ({
      priceCents: row.priceCents,
      year: row.firstRegistration ? row.firstRegistration.getFullYear() : null,
      mileageKm: row.mileageKm,
    })),
  });

  return estimate ? { ...estimate, scope } : null;
}

/**
 * Wie sich ein Preis zur Schätzung verhält.
 *
 * Bewusst grob in drei Stufen: eine prozentgenaue Aussage würde eine
 * Genauigkeit vortäuschen, die die Datenlage nicht hergibt.
 */
export function priceStanding(
  priceCents: number,
  estimate: PriceEstimate,
): 'below' | 'within' | 'above' {
  if (priceCents < estimate.lowCents) return 'below';
  if (priceCents > estimate.highCents) return 'above';
  return 'within';
}
