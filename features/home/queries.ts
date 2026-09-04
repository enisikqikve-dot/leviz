import { prisma } from '@/lib/db';

import { CARD_SELECT } from '../search/queries';

/**
 * Inhalte der Startseite. Alles kommt aus der Datenbank — es gibt keine
 * Platzhalterlisten, damit die Startseite immer den echten Bestand zeigt.
 */

/** Bezahlt hervorgehobene Inserate, hoechster Rangwert zuerst. */
export function getFeaturedVehicles(take = 6) {
  return prisma.vehicle.findMany({
    where: {
      status: 'ACTIVE',
      featuredScore: { gt: 0 },
      OR: [{ featuredUntil: null }, { featuredUntil: { gt: new Date() } }],
    },
    select: CARD_SELECT,
    orderBy: [{ rankScore: 'desc' }, { publishedAt: 'desc' }],
    take,
  });
}

export function getRecentVehicles(take = 6) {
  return prisma.vehicle.findMany({
    where: { status: 'ACTIVE' },
    select: CARD_SELECT,
    orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
    take,
  });
}

/** Marken mit den meisten aktiven Inseraten. */
export async function getPopularBrands(take = 12) {
  const grouped = await prisma.vehicle.groupBy({
    by: ['brandId'],
    where: { status: 'ACTIVE' },
    _count: { _all: true },
    orderBy: { _count: { brandId: 'desc' } },
    take,
  });

  const brands = await prisma.brand.findMany({
    where: { id: { in: grouped.map((entry) => entry.brandId) } },
    select: { id: true, name: true, slug: true },
  });

  const byId = new Map(brands.map((brand) => [brand.id, brand]));

  return grouped
    .map((entry) => {
      const brand = byId.get(entry.brandId);
      return brand ? { ...brand, count: entry._count._all } : null;
    })
    .filter((entry): entry is { id: string; name: string; slug: string; count: number } =>
      entry !== null,
    );
}

/** Geprüfte Händler mit der besten Bewertung und ausreichend Bestand. */
export async function getFeaturedDealers(take = 4) {
  const dealers = await prisma.dealer.findMany({
    where: { verification: 'VERIFIED' },
    select: {
      id: true, slug: true, companyName: true, logoUrl: true,
      ratingAvg: true, ratingCount: true,
      city: { select: { name: true } },
      country: { select: { code: true } },
      _count: { select: { vehicles: { where: { status: 'ACTIVE' } } } },
    },
    orderBy: [{ ratingAvg: 'desc' }, { ratingCount: 'desc' }],
    take: take * 3,
  });

  return dealers
    .filter((dealer) => dealer._count.vehicles >= 5)
    .slice(0, take);
}

/** Kennzahlen für die Vertrauensleiste unter dem Suchfeld. */
export async function getMarketplaceStats() {
  const [vehicles, dealers, cities] = await Promise.all([
    prisma.vehicle.count({ where: { status: 'ACTIVE' } }),
    prisma.dealer.count({ where: { verification: 'VERIFIED' } }),
    prisma.city.count({ where: { vehicles: { some: { status: 'ACTIVE' } } } }),
  ]);

  return { vehicles, dealers, cities };
}
