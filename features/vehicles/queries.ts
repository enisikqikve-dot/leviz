import { cache } from 'react';

import { CARD_SELECT } from '@/features/search/queries';
import type { Prisma } from '@/lib/generated/prisma/client';
import { prisma } from '@/lib/db';

/**
 * Vollständiger Datensatz der Detailseite. In `cache` gehüllt, damit
 * `generateMetadata` und die Seite selbst sich eine Abfrage teilen statt
 * zweimal dieselbe zu stellen.
 */
export const getVehicleBySlug = cache(async (slug: string) => {
  return prisma.vehicle.findUnique({
    where: { slug },
    include: {
      brand: { select: { name: true, slug: true } },
      model: { select: { name: true, slug: true } },
      variant: { select: { name: true } },
      city: { select: { name: true, slug: true, lat: true, lng: true } },
      country: { select: { code: true, nameSq: true, nameDe: true, nameEn: true } },
      importedFrom: { select: { code: true, nameSq: true, nameDe: true, nameEn: true } },
      images: { orderBy: { position: 'asc' } },
      features: {
        include: {
          feature: {
            select: {
              slug: true, nameSq: true, nameDe: true, nameEn: true, group: true,
            },
          },
        },
      },
      seller: {
        select: {
          id: true, name: true, image: true, phone: true, createdAt: true,
          trustScore: true, verification: true,
        },
      },
      dealer: {
        select: {
          id: true, slug: true, companyName: true, logoUrl: true, phone: true,
          website: true, publicEmail: true, addressLine: true, postalCode: true,
          description: true, openingHours: true, verification: true,
          ratingAvg: true, ratingCount: true,
          city: { select: { name: true } },
          _count: { select: { vehicles: { where: { status: 'ACTIVE' } } } },
        },
      },
    },
  });
});

export type VehicleDetail = NonNullable<Awaited<ReturnType<typeof getVehicleBySlug>>>;

/**
 * Ähnliche Fahrzeuge in drei Stufen, jede breiter als die vorige:
 * dasselbe Modell in ähnlicher Preislage, dann dieselbe Marke mit derselben
 * Karosserieform, zuletzt dieselbe Karosserieform in ähnlicher Preislage.
 *
 * Die dritte Stufe ist nötig, weil bei einem älteren Fahrzeug in einer engen
 * Preisklasse sonst nur ein oder zwei Treffer entstehen — ein halbleerer
 * Abschnitt wirkt auf einem Marktplatz wie ein Fehler.
 */
export async function getSimilarVehicles(vehicle: VehicleDetail, take = 3) {
  const priceSpan = Math.round(vehicle.priceCents * 0.35);
  const priceRange = {
    gte: vehicle.priceCents - priceSpan,
    lte: vehicle.priceCents + priceSpan,
  };

  const collected: Awaited<ReturnType<typeof findSimilar>> = [];
  const seen = new Set<string>([vehicle.id]);

  const tiers = [
    { modelId: vehicle.modelId, priceCents: priceRange },
    { brandId: vehicle.brandId, bodyType: vehicle.bodyType },
    { bodyType: vehicle.bodyType, priceCents: priceRange },
  ];

  for (const tier of tiers) {
    if (collected.length >= take) break;

    const rows = await findSimilar(
      { ...tier, id: { notIn: [...seen] } },
      take - collected.length,
    );

    for (const row of rows) {
      seen.add(row.id);
      collected.push(row);
    }
  }

  return collected;
}

function findSimilar(where: Prisma.VehicleWhereInput, take: number) {
  return prisma.vehicle.findMany({
    where: { status: 'ACTIVE', ...where },
    select: CARD_SELECT,
    orderBy: { rankScore: 'desc' },
    take,
  });
}

/**
 * Zählt einen Aufruf. Läuft bewusst ohne await im Seitenaufbau, damit die
 * Anzeige nicht auf den Schreibvorgang wartet.
 */
export async function recordView(input: {
  vehicleId: string;
  userId?: string | null;
  sessionId?: string | null;
  referrer?: string | null;
}): Promise<void> {
  try {
    await prisma.$transaction([
      prisma.listingView.create({
        data: {
          vehicleId: input.vehicleId,
          userId: input.userId ?? null,
          sessionId: input.sessionId ?? null,
          referrer: input.referrer ?? null,
        },
      }),
      prisma.vehicle.update({
        where: { id: input.vehicleId },
        data: { viewCount: { increment: 1 } },
      }),
    ]);
  } catch {
    // Ein fehlgeschlagener Zähler darf die Detailseite nie kaputt machen.
  }
}
