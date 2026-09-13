import { z } from 'zod';

import { credentialsLoginSchema } from '@/features/auth/schemas';
import { enforceLimit, requestIp } from '@/lib/api/limit';
import { handle, ok, readJson, unauthorized } from '@/lib/api/respond';
import { accountPayload, ACCOUNT_SELECT } from '@/lib/api/serialize';
import { issueSession } from '@/lib/api/sessions';
import { authenticateWithPassword } from '@/lib/auth/password-login';
import { prisma } from '@/lib/db';

/**
 * POST /api/v1/auth/login
 *
 * { email, password, device? } -> { user, accessToken, refreshToken, expiresIn }
 *
 * Dieselbe Passwortpruefung wie auf der Website, dieselbe Ratenbegrenzung.
 * Die Antwort bei falschen Daten ist immer dieselbe -- sie verraet nicht, ob
 * es die Adresse gibt.
 */
const schema = credentialsLoginSchema.extend({
  device: z.string().trim().max(120).optional(),
});

export const POST = handle(async (request) => {
  await enforceLimit('login', requestIp(request));

  const input = schema.parse(await readJson(request));

  const konto = await authenticateWithPassword(input.email, input.password);
  if (!konto) throw unauthorized('invalid-credentials');

  const [session, user] = await Promise.all([
    issueSession(konto.id, input.device ?? null),
    prisma.user.findUniqueOrThrow({ where: { id: konto.id }, select: ACCOUNT_SELECT }),
  ]);

  return ok({ user: accountPayload(user), ...session });
});
