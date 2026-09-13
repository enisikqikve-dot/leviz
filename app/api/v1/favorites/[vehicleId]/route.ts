import { setFavorite } from '@/features/favorites/core';
import { requireApiUser } from '@/lib/api/auth';
import { handle, noContent } from '@/lib/api/respond';

/** DELETE /api/v1/favorites/{vehicleId} -> vergessen. Unbekannt ist kein Fehler. */
export const DELETE = handle(async (request, { params }) => {
  const user = await requireApiUser(request);
  const { vehicleId } = await params;

  await setFavorite(user.id, vehicleId, false);
  return noContent();
});
