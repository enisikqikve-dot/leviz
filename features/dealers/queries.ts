import type { Prisma } from '@/lib/generated/prisma/client';
import { prisma } from '@/lib/db';

export const DEALER_CARD_SELECT = {
  id: true, slug: true, companyName: true, logoUrl: true, description: true,
  verification: true, verifiedAt: true, ratingAvg: true, ratingCount: true,
  city: { select: { name: true, slug: true } },
  country: { select: { code: true } },
  _count: { select: { vehicles: { where: { status: 'ACTIVE' } } } },
} satisfies Prisma.DealerSelect;

export type DealerCard = Prisma.DealerGetPayload<{ select: typeof DEALER_CARD_SELECT }>;

export type DealerSort = 'rating' | 'vehicles' | 'name';

/** Händlerverzeichnis mit Freitextsuche und Sortierung. */
export async function listDealers(options: {
  query?: string;
  verifiedOnly?: boolean;
  sort?: DealerSort;
}) {
  const where: Prisma.DealerWhereInput = {};

  if (options.verifiedOnly) where.verification = 'VERIFIED';

  if (options.query) {
    where.OR = [
      { companyName: { contains: options.query, mode: 'insensitive' } },
      { city: { name: { contains: options.query, mode: 'insensitive' } } },
    ];
  }

  const dealers = await prisma.dealer.findMany({
    where,
    select: DEALER_CARD_SELECT,
    orderBy:
      options.sort === 'name'
        ? [{ companyName: 'asc' }]
        : [{ ratingAvg: 'desc' }, { ratingCount: 'desc' }],
  });

  // Nach Bestand sortieren geht nicht in der Datenbank, weil die Zahl aus
  // einem gefilterten Unterzaehler stammt.
  if (options.sort === 'vehicles') {
    return [...dealers].sort((a, b) => b._count.vehicles - a._count.vehicles);
  }

  return dealers;
}

/** Vollständiges Händlerprofil samt Bewertungen. */
export async function getDealerBySlug(slug: string) {
  return prisma.dealer.findUnique({
    where: { slug },
    include: {
      city: { select: { name: true, slug: true, lat: true, lng: true } },
      country: { select: { code: true, nameSq: true, nameDe: true, nameEn: true } },
      user: { select: { id: true, createdAt: true } },
      reviews: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { author: { select: { name: true, image: true } } },
      },
      _count: {
        select: {
          vehicles: { where: { status: 'ACTIVE' } },
          reviews: true,
        },
      },
    },
  });
}

export type DealerDetail = NonNullable<Awaited<ReturnType<typeof getDealerBySlug>>>;
