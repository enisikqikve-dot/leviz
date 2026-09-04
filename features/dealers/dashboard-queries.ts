import { prisma } from '@/lib/db';

export type DealerStats = {
  activeListings: number;
  soldVehicles: number;
  totalViews: number;
  totalInquiries: number;
  totalFavorites: number;
  /** Anfragen je 100 Aufrufe. */
  conversion: number;
};

/** Kennzahlen eines Händlers oder, ohne Händler, eines Privatverkäufers. */
export async function getSellerStats(where: {
  dealerId?: string;
  sellerId?: string;
}): Promise<DealerStats> {
  const scope = where.dealerId ? { dealerId: where.dealerId } : { sellerId: where.sellerId };

  const [active, sold, sums] = await Promise.all([
    prisma.vehicle.count({ where: { ...scope, status: 'ACTIVE' } }),
    prisma.vehicle.count({ where: { ...scope, status: 'SOLD' } }),
    prisma.vehicle.aggregate({
      where: scope,
      _sum: { viewCount: true, inquiryCount: true, favoriteCount: true },
    }),
  ]);

  const totalViews = sums._sum.viewCount ?? 0;
  const totalInquiries = sums._sum.inquiryCount ?? 0;

  return {
    activeListings: active,
    soldVehicles: sold,
    totalViews,
    totalInquiries,
    totalFavorites: sums._sum.favoriteCount ?? 0,
    // Ohne Aufrufe ist die Quote nicht null, sondern unbekannt — hier als 0.
    conversion: totalViews > 0 ? Number(((totalInquiries / totalViews) * 100).toFixed(1)) : 0,
  };
}

export type DayPoint = { date: string; views: number };

/**
 * Aufrufe der letzten Tage, lückenlos.
 *
 * Tage ohne Aufrufe müssen als Null erscheinen, sonst zieht das Diagramm eine
 * Linie über die Lücke und suggeriert Verlauf, den es nicht gab.
 */
export async function getViewsOverTime(
  where: { dealerId?: string; sellerId?: string },
  days = 30,
): Promise<DayPoint[]> {
  const scope = where.dealerId ? { dealerId: where.dealerId } : { sellerId: where.sellerId };

  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));

  const views = await prisma.listingView.findMany({
    where: { vehicle: scope, createdAt: { gte: since } },
    select: { createdAt: true },
  });

  const counts = new Map<string, number>();
  for (const view of views) {
    const key = view.createdAt.toISOString().slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(since);
    date.setDate(since.getDate() + index);
    const key = date.toISOString().slice(0, 10);
    return { date: key, views: counts.get(key) ?? 0 };
  });
}

/** Fahrzeuge mit dem meisten Interesse. */
export async function getTopVehicles(
  where: { dealerId?: string; sellerId?: string },
  take = 5,
) {
  const scope = where.dealerId ? { dealerId: where.dealerId } : { sellerId: where.sellerId };

  return prisma.vehicle.findMany({
    where: { ...scope, status: 'ACTIVE' },
    select: {
      id: true, slug: true, title: true, priceCents: true,
      viewCount: true, inquiryCount: true, favoriteCount: true,
      brand: { select: { name: true } },
      model: { select: { name: true } },
      images: { select: { url: true }, orderBy: { position: 'asc' }, take: 1 },
    },
    orderBy: [{ inquiryCount: 'desc' }, { viewCount: 'desc' }],
    take,
  });
}
