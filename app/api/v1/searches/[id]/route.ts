import { deleteSavedSearch } from '@/features/searches/core';
import { requireApiUser } from '@/lib/api/auth';
import { handle, noContent, unwrap } from '@/lib/api/respond';

/** DELETE /api/v1/searches/{id} -> 204. */
export const DELETE = handle(async (request, { params }) => {
  const user = await requireApiUser(request);
  const { id } = await params;

  unwrap(await deleteSavedSearch(user.id, id));
  return noContent();
});
