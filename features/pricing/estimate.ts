/**
 * Preisschätzung aus Vergleichsangeboten.
 *
 * Bewusst kein Sprachmodell: Ein Preis ist eine Zahl, die aus tatsächlichen
 * Angeboten folgt. Ein Modell würde sie plausibel klingend erfinden, ohne dass
 * jemand sie nachrechnen könnte. Hier ist jeder Schritt nachvollziehbar, und
 * die Anzahl der Vergleichsfahrzeuge steht mit im Ergebnis — wer nur drei
 * Vergleiche hat, soll das sehen.
 */

export type Comparable = {
  priceCents: number;
  year: number | null;
  mileageKm: number | null;
};

export type EstimateInput = {
  year: number | null;
  mileageKm: number | null;
  comparables: Comparable[];
};

export type PriceEstimate = {
  lowCents: number;
  averageCents: number;
  highCents: number;
  sampleSize: number;
  /** 0 bis 1. Wächst mit der Stichprobe und sinkt mit der Streuung. */
  confidence: number;
};

/** Ab dieser Anzahl Vergleichsangebote ist eine Schätzung überhaupt sinnvoll. */
export const MIN_SAMPLE = 4;

/** Quantil einer aufsteigend sortierten Liste, linear interpoliert. */
export function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];

  const position = (sorted.length - 1) * q;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);

  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

/**
 * Gewicht eines Vergleichsfahrzeugs.
 *
 * Näher am Baujahr und am Kilometerstand heißt vergleichbarer. Fehlt eine
 * Angabe, zählt das Fahrzeug mit halbem Gewicht mit, statt zu verschwinden.
 */
export function similarity(target: EstimateInput, item: Comparable): number {
  let weight = 1;

  if (target.year !== null && item.year !== null) {
    // Zehn Jahre Abstand halbieren das Gewicht mehrfach; danach zählt es kaum.
    weight *= 1 / (1 + Math.abs(target.year - item.year) / 3);
  } else {
    weight *= 0.5;
  }

  if (target.mileageKm !== null && item.mileageKm !== null) {
    const delta = Math.abs(target.mileageKm - item.mileageKm);
    weight *= 1 / (1 + delta / 80_000);
  } else {
    weight *= 0.5;
  }

  return weight;
}

/**
 * Ausreißer weglassen: alles außerhalb des 10-%- bis 90-%-Bereichs.
 *
 * Es werden die Fahrzeuge aussortiert, nicht nur ihre Preise. Sonst flösse ein
 * offensichtlich falsch eingetragener Preis zwar nicht in die Spanne, aber
 * weiterhin in den Mittelwert — und zöge ihn allein nach oben.
 */
function withoutOutliers(items: Comparable[]): Comparable[] {
  if (items.length < 5) return items;

  const sorted = items.map((item) => item.priceCents).sort((a, b) => a - b);
  const low = quantile(sorted, 0.1);
  const high = quantile(sorted, 0.9);

  const kept = items.filter((item) => item.priceCents >= low && item.priceCents <= high);
  return kept.length > 0 ? kept : items;
}

/**
 * Schätzt den Preis. `null`, wenn die Stichprobe zu klein ist — eine Zahl aus
 * zwei Angeboten wäre eine Behauptung, keine Schätzung.
 */
export function estimatePrice(input: EstimateInput): PriceEstimate | null {
  const usable = input.comparables.filter((item) => item.priceCents > 0);
  if (usable.length < MIN_SAMPLE) return null;

  const trimmed = withoutOutliers(usable);

  const weighted = trimmed.map((item) => ({
    price: item.priceCents,
    weight: similarity(input, item),
  }));

  const totalWeight = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  if (totalWeight <= 0) return null;

  const average = Math.round(
    weighted.reduce((sum, entry) => sum + entry.price * entry.weight, 0) / totalWeight,
  );

  const sorted = trimmed.map((item) => item.priceCents).sort((a, b) => a - b);

  const low = Math.round(quantile(sorted, 0.2));
  const high = Math.round(quantile(sorted, 0.8));

  // Streuung als Anteil des Mittelwerts: eine enge Spanne ist verlässlicher.
  const spread = average > 0 ? (high - low) / average : 1;
  const bySample = Math.min(1, usable.length / 25);
  const bySpread = Math.max(0, 1 - spread);

  return {
    lowCents: Math.min(low, average),
    averageCents: average,
    highCents: Math.max(high, average),
    sampleSize: usable.length,
    confidence: Math.round(bySample * 0.5 * 100 + bySpread * 0.5 * 100) / 100,
  };
}
