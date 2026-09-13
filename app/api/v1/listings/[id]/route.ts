import { deleteListing, saveListing } from '@/features/listings/core';
import { EDITABLE_INCLUDE, toFormValues } from '@/features/listings/form-values';
import { requireApiUser } from '@/lib/api/auth';
import { handle, noContent, notFound, ok, readJson, unwrap } from '@/lib/api/respond';
import { canManage } from '@/lib/auth/permissions';
import { prisma } from '@/lib/db';

/**
 * GET /api/v1/listings/{id} -> ein eigenes Inserat zum Bearbeiten.
 *
 * Geliefert wird der Datensatz in der Form des Assistenten (`values`), dazu
 * Status und Titel. Fremde Inserate sind nicht da -- 404, nicht 403: wer die
 * Kennung raet, erfaehrt nicht einmal, dass es sie gibt.
 */
export const GET = handle(async (request, { params }) => {
  const user = await requireApiUser(request);
  const { id } = await params;

  const vehicle = await prisma.vehicle.findUnique({ where: { id }, include: EDITABLE_INCLUDE });
  if (!vehicle || !canManage(user, vehicle)) throw notFound('listing');

  return ok({
    id: vehicle.id,
    slug: vehicle.slug,
    title: vehicle.title,
    status: vehicle.status,
    values: toFormValues(vehicle),
  });
});

/** PUT /api/v1/listings/{id} {ListingFormValues} -> aktualisieren. */
export const PUT = handle(async (request, { params }) => {
  const user = await requireApiUser(request);
  const { id } = await params;

  return ok(unwrap(await saveListing(user, await readJson(request), id)));
});

/** DELETE /api/v1/listings/{id} -> endgueltig loeschen, samt Fotos. */
export const DELETE = handle(async (request, { params }) => {
  const user = await requireApiUser(request);
  const { id } = await params;

  unwrap(await deleteListing(user, id));
  return noContent();
});
