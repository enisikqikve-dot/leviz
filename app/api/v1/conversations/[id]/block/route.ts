import { toggleConversationBlock } from '@/features/messages/core';
import { requireApiUser } from '@/lib/api/auth';
import { handle, ok, unwrap } from '@/lib/api/respond';

/** POST /api/v1/conversations/{id}/block -> blockieren oder wieder freigeben; `blocked` sagt, was jetzt gilt. */
export const POST = handle(async (request, { params }) => {
  const user = await requireApiUser(request);
  const { id } = await params;

  return ok(unwrap(await toggleConversationBlock(user.id, id)));
});
