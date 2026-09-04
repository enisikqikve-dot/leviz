/**
 * Reihung der Suchergebnisse. Sie ist bewusst nachvollziehbar und nie
 * zufaellig: Wer bezahlt, steht oben; darunter entscheidet die Pflege des
 * Inserats, dann das Vertrauen in den Verkaeufer. Die Aktualitaet kommt als
 * Gleichstandsregel ueber publishedAt hinzu — so veraltet der gespeicherte
 * Wert nicht und muss nicht staendig neu berechnet werden.
 */

export type RankInput = {
  /** Aus einer gebuchten Hervorhebung, 0 bis 100. */
  featuredScore: number;
  /** Vollstaendigkeit des Inserats, 0 bis 100. */
  qualityScore: number;
  /** Vertrauenswert des Verkaeufers, 0 bis 100. */
  sellerTrustScore: number;
};

const WEIGHTS = {
  /** Bezahlte Platzierung schlaegt alles andere. */
  featured: 1000,
  quality: 5,
  trust: 2,
} as const;

export const MAX_RANK_SCORE =
  100 * WEIGHTS.featured + 100 * WEIGHTS.quality + 100 * WEIGHTS.trust;

const clamp = (value: number) => Math.min(100, Math.max(0, Math.round(value)));

export function computeRankScore(input: RankInput): number {
  return (
    clamp(input.featuredScore) * WEIGHTS.featured +
    clamp(input.qualityScore) * WEIGHTS.quality +
    clamp(input.sellerTrustScore) * WEIGHTS.trust
  );
}

/** Zerlegt einen Rangwert in seine Bestandteile — fuer Diagnose und Tests. */
export function explainRankScore(input: RankInput) {
  return {
    featured: clamp(input.featuredScore) * WEIGHTS.featured,
    quality: clamp(input.qualityScore) * WEIGHTS.quality,
    trust: clamp(input.sellerTrustScore) * WEIGHTS.trust,
    total: computeRankScore(input),
  };
}
