import { z } from 'zod';

import { handle, ok, readJson } from '@/lib/api/respond';
import { rotateSession } from '@/lib/api/sessions';

/**
 * POST /api/v1/auth/refresh
 *
 * { refreshToken } -> neues Paar. Das alte Token ist danach verbraucht.
 * Ein verbrauchtes Token ein zweites Mal beendet alle Anmeldungen des Kontos
 * -- siehe lib/api/sessions.
 */
const schema = z.object({ refreshToken: z.string().min(20).max(200) });

export const POST = handle(async (request) => {
  const input = schema.parse(await readJson(request));
  return ok(await rotateSession(input.refreshToken));
});
