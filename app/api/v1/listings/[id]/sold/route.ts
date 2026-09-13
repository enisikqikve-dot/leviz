import { markListingSold } from '@/features/listings/core';
import { requireApiUser } from '@/lib/api/auth';
import { handle, noContent, unwrap } from '@/lib/api/respond';

/** POST /api/v1/listings/{id}/sold -> als verkauft markieren. */
export const POST = handle(async (request, { params }) => {
  const user = await requireApiUser(request);
  const { id } = await params;

  unwrap(await markListingSold(user, id));
  return noContent();
});
