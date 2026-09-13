import { z } from 'zod';

import { createAccount } from '@/features/auth/create-account';
import { registerSchema } from '@/features/auth/schemas';
import { enforceLimit, requestIp } from '@/lib/api/limit';
import { ApiError, handle, ok, readJson } from '@/lib/api/respond';
import { accountPayload, ACCOUNT_SELECT } from '@/lib/api/serialize';
import { issueSession } from '@/lib/api/sessions';
import { prisma } from '@/lib/db';
import { locales } from '@/lib/i18n/routing';

/**
 * POST /api/v1/auth/register
 *
 * Dieselben Felder wie das Formular, dazu `locale` und `device`. Angelegt wird
 * ueber denselben Kern wie auf der Website; die App ist danach sofort
 * angemeldet und braucht keinen zweiten Aufruf.
 */
const schema = z.object({
  locale: z.enum(locales).default('sq'),
  device: z.string().trim().max(120).optional(),
});

export const POST = handle(async (request) => {
  await enforceLimit('register', requestIp(request));

  const rumpf = await readJson(request);
  const input = registerSchema.parse(rumpf);
  const extra = schema.parse(rumpf);

  const ergebnis = await createAccount(input, extra.locale);
  if (!ergebnis.ok) throw new ApiError(409, 'email-taken');

  const [session, user] = await Promise.all([
    issueSession(ergebnis.userId, extra.device ?? null),
    prisma.user.findUniqueOrThrow({ where: { id: ergebnis.userId }, select: ACCOUNT_SELECT }),
  ]);

  return ok({ user: accountPayload(user), ...session }, { status: 201 });
});
