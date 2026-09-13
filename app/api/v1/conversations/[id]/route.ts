import { getConversation } from '@/features/messages/queries';
import { requireApiUser } from '@/lib/api/auth';
import { handle, notFound, ok } from '@/lib/api/respond';

/**
 * GET /api/v1/conversations/{id} -> der Faden mit allen Nachrichten, aelteste
 * zuerst. Fremde Gespraeche sind nicht da -- 404, nicht 403.
 *
 * Gelesen wird ein Gespraech nicht durch Ansehen, sondern durch
 * POST .../read: die App ruft das auf, sobald der Faden auf dem Bildschirm
 * ist. So bleibt ein Aufruf zum Vorausladen folgenlos.
 */
export const GET = handle(async (request, { params }) => {
  const user = await requireApiUser(request);
  const { id } = await params;

  const conversation = await getConversation(id, user.id);
  if (!conversation) throw notFound('conversation');

  return ok({
    id: conversation.id,
    status: conversation.status,
    isBuyer: conversation.isBuyer,
    blockedByMe: conversation.status === 'BLOCKED' && conversation.blockedById === user.id,
    counterpartName: conversation.counterpartName,
    vehicle: {
      id: conversation.vehicle.id,
      slug: conversation.vehicle.slug,
      title: conversation.vehicle.title,
      status: conversation.vehicle.status,
      priceCents: conversation.vehicle.priceCents,
      image: conversation.vehicle.images[0]?.url ?? null,
    },
    messages: conversation.messages.map((m) => ({
      id: m.id,
      body: m.body,
      createdAt: m.createdAt,
      mine: m.senderId === user.id,
    })),
  });
});
