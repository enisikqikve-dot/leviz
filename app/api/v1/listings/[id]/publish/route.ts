import { publishListing } from '@/features/listings/core';
import { requireApiUser } from '@/lib/api/auth';
import { handle, ok, unwrap } from '@/lib/api/respond';

/**
 * POST /api/v1/listings/{id}/publish -> live schalten.
 *
 * Antwort `status`: ACTIVE, oder PENDING_REVIEW, wenn die automatische
 * Pruefung angeschlagen hat. Die Paketgrenze gilt hier, nicht beim Speichern.
 */
export const POST = handle(async (request, { params }) => {
  const user = await requireApiUser(request);
  const { id } = await params;

  return ok(unwrap(await publishListing(user, id)));
});
