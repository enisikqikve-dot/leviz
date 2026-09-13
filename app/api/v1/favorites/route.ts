import { z } from 'zod';

import { setFavorite } from '@/features/favorites/core';
import { CARD_SELECT } from '@/features/search/queries';
import { requireApiUser } from '@/lib/api/auth';
import { handle, notFound, ok, readJson } from '@/lib/api/respond';
import { prisma } from '@/lib/db';

/** GET /api/v1/favorites -> die gemerkten Fahrzeuge, neueste zuerst. */
export const GET = handle(async (request) => {
  const user = await requireApiUser(request);

  const favorites = await prisma.favorite.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true, vehicle: { select: CARD_SELECT } },
  });

  return ok({
    items: favorites.map((eintrag) => ({ savedAt: eintrag.createdAt, vehicle: eintrag.vehicle })),
  });
});

/** POST /api/v1/favorites { vehicleId } -> merken. Mehrfach ist kein Fehler. */
const schema = z.object({ vehicleId: z.string().min(1) });

export const POST = handle(async (request) => {
  const user = await requireApiUser(request);
  const input = schema.parse(await readJson(request));

  const ergebnis = await setFavorite(user.id, input.vehicleId, true);
  if (ergebnis === 'vehicle-missing') throw notFound('vehicle');

  return ok({ favorited: true }, { status: ergebnis === 'added' ? 201 : 200 });
});
