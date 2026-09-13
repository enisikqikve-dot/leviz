import { z } from 'zod';

import { sendMessage } from '@/features/messages/core';
import { requireApiUser } from '@/lib/api/auth';
import { handle, ok, readJson, unwrap } from '@/lib/api/respond';

/** POST /api/v1/conversations/{id}/messages { body } -> die neue Nachricht (201). */
const schema = z.object({ body: z.string() });

export const POST = handle(async (request, { params }) => {
  const user = await requireApiUser(request);
  const { id } = await params;
  const { body } = schema.parse(await readJson(request));

  const message = unwrap(await sendMessage(user.id, { conversationId: id, body }));
  return ok({ id: message.id, body: message.body, createdAt: message.createdAt, mine: true }, { status: 201 });
});
