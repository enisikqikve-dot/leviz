import { toggleListingPause } from '@/features/listings/core';
import { requireApiUser } from '@/lib/api/auth';
import { handle, ok, unwrap } from '@/lib/api/respond';

/**
 * POST /api/v1/listings/{id}/pause -> pausieren oder wieder freischalten.
 *
 * Ein Umschalter wie auf der Website: aus ACTIVE wird PAUSED und umgekehrt.
 * Antwort `status` sagt, was es jetzt ist.
 */
export const POST = handle(async (request, { params }) => {
  const user = await requireApiUser(request);
  const { id } = await params;

  return ok(unwrap(await toggleListingPause(user, id)));
});
