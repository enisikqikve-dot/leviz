import { saveListing } from '@/features/listings/core';
import { loadOwnListings } from '@/features/listings/mine';
import { requireApiUser } from '@/lib/api/auth';
import { handle, ok, readJson, unwrap } from '@/lib/api/respond';

/**
 * GET /api/v1/listings -> "Meine Inserate", zuletzt geaendert zuerst.
 *
 * Eigene Inserate und, fuer Haendler, die des Autohauses -- dieselbe Abfrage
 * wie die Seite im Dashboard.
 */
export const GET = handle(async (request) => {
  const user = await requireApiUser(request);
  const items = await loadOwnListings(user);

  return ok({
    items: items.map((vehicle) => ({
      id: vehicle.id,
      slug: vehicle.slug,
      title: vehicle.title,
      status: vehicle.status,
      priceCents: vehicle.priceCents,
      viewCount: vehicle.viewCount,
      inquiryCount: vehicle.inquiryCount,
      favoriteCount: vehicle.favoriteCount,
      qualityScore: vehicle.qualityScore,
      featuredUntil: vehicle.featuredUntil,
      expiresAt: vehicle.expiresAt,
      updatedAt: vehicle.updatedAt,
      brand: vehicle.brand.name,
      model: vehicle.model.name,
      image: vehicle.images[0]?.url ?? null,
    })),
  });
});

/**
 * POST /api/v1/listings {ListingFormValues} -> Entwurf anlegen.
 *
 * Der Rumpf ist genau das, was der Assistent der Website abschickt; geprueft
 * wird mit demselben Schema. Angelegt wird als Entwurf -- sichtbar wird das
 * Inserat erst mit POST /listings/{id}/publish, wo die Paketgrenze gilt.
 */
export const POST = handle(async (request) => {
  const user = await requireApiUser(request);
  const saved = unwrap(await saveListing(user, await readJson(request)));

  return ok(saved, { status: 201 });
});
