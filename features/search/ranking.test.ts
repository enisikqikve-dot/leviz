import { describe, expect, it } from 'vitest';

import { computeRankScore, explainRankScore, MAX_RANK_SCORE } from './ranking';

const plain = { featuredScore: 0, qualityScore: 50, sellerTrustScore: 50 };

describe('Reihung', () => {
  it('ist nie zufaellig: gleiche Eingabe, gleicher Wert', () => {
    expect(computeRankScore(plain)).toBe(computeRankScore(plain));
  });

  it('stellt ein hervorgehobenes Inserat ueber jedes andere', () => {
    const featured = computeRankScore({ featuredScore: 40, qualityScore: 0, sellerTrustScore: 0 });
    const bestOrganic = computeRankScore({ featuredScore: 0, qualityScore: 100, sellerTrustScore: 100 });
    expect(featured).toBeGreaterThan(bestOrganic);
  });

  it('belohnt ein besser gepflegtes Inserat', () => {
    const poor = computeRankScore({ ...plain, qualityScore: 40 });
    const rich = computeRankScore({ ...plain, qualityScore: 95 });
    expect(rich).toBeGreaterThan(poor);
  });

  it('gewichtet Qualitaet staerker als Verkaeufervertrauen', () => {
    const byQuality = computeRankScore({ featuredScore: 0, qualityScore: 100, sellerTrustScore: 0 });
    const byTrust = computeRankScore({ featuredScore: 0, qualityScore: 0, sellerTrustScore: 100 });
    expect(byQuality).toBeGreaterThan(byTrust);
  });

  it('begrenzt Werte ausserhalb von 0 bis 100', () => {
    expect(computeRankScore({ featuredScore: 999, qualityScore: 999, sellerTrustScore: 999 }))
      .toBe(MAX_RANK_SCORE);
    expect(computeRankScore({ featuredScore: -50, qualityScore: -50, sellerTrustScore: -50 }))
      .toBe(0);
  });

  it('laesst sich in seine Bestandteile zerlegen', () => {
    const parts = explainRankScore({ featuredScore: 80, qualityScore: 90, sellerTrustScore: 70 });
    expect(parts.featured + parts.quality + parts.trust).toBe(parts.total);
    expect(parts.featured).toBe(80000);
  });

  it('bleibt im Bereich einer 32-Bit-Ganzzahl', () => {
    expect(MAX_RANK_SCORE).toBeLessThan(2_147_483_647);
  });
});
