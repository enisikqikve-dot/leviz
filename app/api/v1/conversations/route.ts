import { startConversation } from '@/features/messages/core';
import { getConversations } from '@/features/messages/queries';
import { conversationPayload } from '@/features/messages/serialize';
import { requireApiUser } from '@/lib/api/auth';
import { handle, ok, readJson, unwrap } from '@/lib/api/respond';

/**
 * GET /api/v1/conversations -> die eigenen Gespraeche, neueste zuerst, dazu
 * die Zahl der ungelesenen fuer das Abzeichen.
 */
export const GET = handle(async (request) => {
  const user = await requireApiUser(request);
  const rows = await getConversations(user.id);
  const items = rows.map((row) => conversationPayload(row, user.id));

  return ok({ items, unread: items.filter((c) => c.unread).length });
});

/**
 * POST /api/v1/conversations { vehicleId, body } -> Gespraech zum Fahrzeug
 * beginnen; gibt es schon eines, landet die Nachricht dort. 201 mit der
 * Kennung. Dieselbe Funktion und Ratenbegrenzung wie das Formular der
 * Website.
 */
export const POST = handle(async (request) => {
  const user = await requireApiUser(request);
  const result = unwrap(await startConversation(user.id, await readJson(request)));
  return ok(result, { status: 201 });
});
