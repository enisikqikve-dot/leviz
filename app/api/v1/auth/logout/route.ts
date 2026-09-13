import { z } from 'zod';

import { handle, noContent, readJson } from '@/lib/api/respond';
import { revokeSession } from '@/lib/api/sessions';

/**
 * POST /api/v1/auth/logout
 *
 * { refreshToken } -> 204. Beendet die Anmeldung auf diesem Geraet. Ein
 * unbekanntes Token ist kein Fehler: die App will abmelden, und das ist sie
 * dann.
 */
const schema = z.object({ refreshToken: z.string().min(1).max(200) });

export const POST = handle(async (request) => {
  const input = schema.parse(await readJson(request));
  await revokeSession(input.refreshToken);
  return noContent();
});
