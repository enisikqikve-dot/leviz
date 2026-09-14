import { z } from 'zod';

import { loginWithSocialIdentity } from '@/features/auth/social-login';
import { enforceLimit, requestIp } from '@/lib/api/limit';
import { ApiError, forbidden, handle, ok, readJson, unauthorized } from '@/lib/api/respond';
import { accountPayload, ACCOUNT_SELECT } from '@/lib/api/serialize';
import { issueSession } from '@/lib/api/sessions';
import { InvalidIdToken, verifyIdToken } from '@/lib/auth/id-token';
import { nativeAudience } from '@/lib/auth/social';
import { prisma } from '@/lib/db';
import { locales } from '@/lib/i18n/routing';

/**
 * POST /api/v1/auth/social
 *
 * { provider: google|apple, idToken, name?, locale?, device? }
 *   -> { user, accessToken, refreshToken, expiresIn }
 *
 * Die App hat sich beim Anbieter ausgewiesen und bringt dessen ID-Token mit.
 * Hier wird es geprueft (lib/auth/id-token), das Konto gefunden oder angelegt
 * (features/auth/social-login) und dieselbe Sitzung ausgegeben wie nach
 * Passwort oder Registrierung. 201, wenn das Konto gerade entstanden ist.
 *
 * Antworten, die die App unterscheidet:
 *   401 invalid-token       -- Token gefaelscht, abgelaufen oder fuer eine andere App
 *   409 account-exists      -- Adresse gibt es schon, anders angemeldet
 *   403 account-suspended   -- gesperrt
 *   400 provider-unavailable -- Google ohne AUTH_GOOGLE_ID auf dem Server
 */
const schema = z.object({
  provider: z.enum(['google', 'apple']),
  idToken: z.string().min(20).max(8192),
  // Google nennt den Namen im Token, Apple nur beim ersten Mal und nur der
  // App -- deshalb schickt die App ihn mit.
  name: z.string().trim().max(120).nullish(),
  locale: z.enum(locales).default('sq'),
  device: z.string().trim().max(120).optional(),
});

export const POST = handle(async (request) => {
  await enforceLimit('login', requestIp(request));

  const input = schema.parse(await readJson(request));

  const audience = nativeAudience(input.provider);
  if (audience.length === 0) throw new ApiError(400, 'provider-unavailable');

  let identity;
  try {
    identity = await verifyIdToken(input.provider, input.idToken, audience);
  } catch (fehler) {
    if (!(fehler instanceof InvalidIdToken)) throw fehler;
    console.warn(`  LEVIZ: ID-Token abgewiesen — ${fehler.message}`);
    throw unauthorized('invalid-token');
  }

  const ergebnis = await loginWithSocialIdentity(identity, {
    name: input.name ?? null,
    locale: input.locale,
  });
  if (!ergebnis.ok) {
    if (ergebnis.reason === 'account-suspended') throw forbidden('account-suspended');
    throw new ApiError(409, 'account-exists');
  }

  const [session, user] = await Promise.all([
    issueSession(ergebnis.userId, input.device ?? null),
    prisma.user.findUniqueOrThrow({ where: { id: ergebnis.userId }, select: ACCOUNT_SELECT }),
  ]);

  return ok({ user: accountPayload(user), ...session }, { status: ergebnis.created ? 201 : 200 });
});
