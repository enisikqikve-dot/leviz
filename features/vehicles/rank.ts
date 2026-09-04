import { prisma } from '@/lib/db';

import { computeRankScore } from '../search/ranking';

/**
 * Schreibt den vorberechneten Rangwert in die Datenbank.
 *
 * Aufzurufen, wenn sich einer der Eingangswerte aendert: nach dem Anlegen oder
 * Bearbeiten eines Inserats, nach dem Buchen einer Hervorhebung und wenn sich
 * der Vertrauenswert eines Verkaeufers verschiebt. Die Gewichtung selbst steht
 * nur an einer Stelle, naemlich in features/search/ranking.ts.
 */
export async function refreshRankScores(vehicleIds?: string[]): Promise<number> {
  const vehicles = await prisma.vehicle.findMany({
    where: vehicleIds ? { id: { in: vehicleIds } } : undefined,
    select: {
      id: true,
      rankScore: true,
      featuredScore: true,
      qualityScore: true,
      seller: { select: { trustScore: true } },
    },
  });

  const changed = vehicles
    .map((vehicle) => ({
      id: vehicle.id,
      current: vehicle.rankScore,
      next: computeRankScore({
        featuredScore: vehicle.featuredScore,
        qualityScore: vehicle.qualityScore,
        sellerTrustScore: vehicle.seller.trustScore,
      }),
    }))
    .filter((entry) => entry.current !== entry.next);

  if (changed.length === 0) return 0;

  // In Bloecken schreiben, damit auch grosse Bestaende nicht eine einzige
  // riesige Transaktion erzeugen.
  const CHUNK = 200;
  for (let i = 0; i < changed.length; i += CHUNK) {
    await prisma.$transaction(
      changed.slice(i, i + CHUNK).map((entry) =>
        prisma.vehicle.update({
          where: { id: entry.id },
          data: { rankScore: entry.next },
        }),
      ),
    );
  }

  return changed.length;
}
