import { markSearchSeen } from '@/features/searches/core';
import { requireApiUser } from '@/lib/api/auth';
import { handle, noContent, unwrap } from '@/lib/api/respond';

/** POST /api/v1/searches/{id}/seen -> die neuen Treffer gelten als gesehen (204). */
export const POST = handle(async (request, { params }) => {
  const user = await requireApiUser(request);
  const { id } = await params;

  unwrap(await markSearchSeen(user.id, id));
  return noContent();
});
