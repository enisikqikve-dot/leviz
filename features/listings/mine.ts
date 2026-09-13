import type { Actor } from '@/lib/auth/permissions';
import { prisma } from '@/lib/db';
import type { Prisma } from '@/lib/generated/prisma/client';

/**
 * "Meine Inserate" -- eine Abfrage fuer Website und App.
 *
 * Eigene Inserate und, fuer Haendler, die des Autohauses: ein Mitarbeiter
 * sieht den ganzen Bestand, nicht nur, was er selbst angelegt hat.
 */
export const OWN_LISTING_SELECT = {
  id: true, slug: true, title: true, status: true, priceCents: true,
  viewCount: true, inquiryCount: true, favoriteCount: true, qualityScore: true,
  featuredUntil: true, expiresAt: true, updatedAt: true,
  brand: { select: { name: true } },
  model: { select: { name: true } },
  images: { select: { url: true }, orderBy: { position: 'asc' }, take: 1 },
} satisfies Prisma.VehicleSelect;

export type OwnListing = Prisma.VehicleGetPayload<{ select: typeof OWN_LISTING_SELECT }>;

export function ownListingsWhere(actor: Pick<Actor, 'id' | 'dealerId'>): Prisma.VehicleWhereInput {
  return actor.dealerId
    ? { OR: [{ sellerId: actor.id }, { dealerId: actor.dealerId }] }
    : { sellerId: actor.id };
}

export async function loadOwnListings(actor: Pick<Actor, 'id' | 'dealerId'>): Promise<OwnListing[]> {
  return prisma.vehicle.findMany({
    where: ownListingsWhere(actor),
    select: OWN_LISTING_SELECT,
    orderBy: [{ updatedAt: 'desc' }],
  });
}
