import { z } from 'zod';

import { requireApiUser } from '@/lib/api/auth';
import { handle, noContent, ok, readJson } from '@/lib/api/respond';
import { prisma } from '@/lib/db';

/**
 * POST /api/v1/devices { token, platform, device? } -> das Telefon fuer Push
 * anmelden.
 *
 * Das Token gehoert genau einem Konto. Meldet sich auf demselben Geraet
 * jemand anderes an, wandert es zu ihm -- sonst bekaeme der Vorgaenger die
 * Nachrichten des Nachfolgers. Ein stillgelegtes Token, das wiederkommt,
 * lebt wieder: die App hat es gerade frisch vom Dienst bekommen.
 */
const schema = z.object({
  token: z.string().min(10).max(200),
  platform: z.enum(['ios', 'android', 'web']),
  device: z.string().trim().max(120).optional(),
});

export const POST = handle(async (request) => {
  const user = await requireApiUser(request);
  const input = schema.parse(await readJson(request));

  const platform = input.platform.toUpperCase() as 'IOS' | 'ANDROID' | 'WEB';
  const vorher = await prisma.deviceToken.findUnique({ where: { token: input.token }, select: { userId: true } });

  await prisma.deviceToken.upsert({
    where: { token: input.token },
    create: { userId: user.id, token: input.token, platform, device: input.device },
    update: { userId: user.id, platform, device: input.device, lastSeenAt: new Date(), disabledAt: null },
  });

  return ok({ registered: true }, { status: vorher ? 200 : 201 });
});

/** DELETE /api/v1/devices { token } -> beim Abmelden: dieses Telefon bekommt nichts mehr. */
const loeschSchema = z.object({ token: z.string().min(10).max(200) });

export const DELETE = handle(async (request) => {
  const user = await requireApiUser(request);
  const { token } = loeschSchema.parse(await readJson(request));

  // Nur das eigene. Ein fremdes Token abzumelden waere ein stiller Angriff.
  await prisma.deviceToken.deleteMany({ where: { token, userId: user.id } });
  return noContent();
});
