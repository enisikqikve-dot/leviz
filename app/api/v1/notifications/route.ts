import { z } from 'zod';

import { requireApiUser } from '@/lib/api/auth';
import { handle, ok } from '@/lib/api/respond';
import { prisma } from '@/lib/db';

/**
 * GET /api/v1/notifications?cursor=...&limit=30
 *
 * Die eigenen Benachrichtigungen, neueste zuerst, dazu die Zahl der
 * ungelesenen fuer das Abzeichen am Symbol.
 *
 * Bemerkenswert daran ist nur eines: es ist die erste Stelle im Projekt, die
 * diese Tabelle liest. Zehn Arten von Meldungen wurden bisher geschrieben und
 * von niemandem gesehen. Die App bekommt sie als Erste.
 */
const schema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

export const GET = handle(async (request) => {
  const user = await requireApiUser(request);
  const url = new URL(request.url);
  const { cursor, limit } = schema.parse(Object.fromEntries(url.searchParams.entries()));

  const [items, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true, type: true, title: true, body: true, href: true, data: true,
        readAt: true, createdAt: true,
      },
    }),
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
  ]);

  const hatMehr = items.length > limit;
  const seite = hatMehr ? items.slice(0, limit) : items;

  return ok({
    items: seite,
    unread,
    nextCursor: hatMehr ? seite[seite.length - 1]!.id : null,
  });
});
