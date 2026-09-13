import { markConversationRead } from '@/features/messages/core';
import { requireApiUser } from '@/lib/api/auth';
import { handle, noContent, unwrap } from '@/lib/api/respond';

/** POST /api/v1/conversations/{id}/read -> als gelesen markieren (204). */
export const POST = handle(async (request, { params }) => {
  const user = await requireApiUser(request);
  const { id } = await params;

  unwrap(await markConversationRead(user.id, id));
  return noContent();
});
