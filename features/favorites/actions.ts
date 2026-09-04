'use server';

import { revalidatePath } from 'next/cache';

import { fail, ok, type ActionResult } from '@/lib/action-result';
import { getSessionUser } from '@/lib/auth/guards';
import { prisma } from '@/lib/db';

export type FavoriteResult = { favorited: boolean; requiresLogin?: true };

/**
 * Setzt oder entfernt ein Fahrzeug auf der Merkliste. Ohne Anmeldung wird nicht
 * geworfen, sondern ein Hinweis zurueckgegeben — der Aufrufer schickt den
 * Nutzer dann zur Anmeldung, ohne die Seite zu verlieren.
 */
export async function toggleFavoriteAction(
  vehicleId: string,
): Promise<ActionResult<FavoriteResult>> {
  const user = await getSessionUser();
  if (!user) return ok({ favorited: false, requiresLogin: true });

  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    select: { id: true },
  });
  if (!vehicle) return fail('Fahrzeug nicht gefunden');

  const existing = await prisma.favorite.findUnique({
    where: { userId_vehicleId: { userId: user.id, vehicleId } },
    select: { id: true },
  });

  if (existing) {
    await prisma.$transaction([
      prisma.favorite.delete({ where: { id: existing.id } }),
      prisma.vehicle.update({
        where: { id: vehicleId },
        data: { favoriteCount: { decrement: 1 } },
      }),
    ]);
    revalidatePath('/favorites');
    return ok({ favorited: false });
  }

  await prisma.$transaction([
    prisma.favorite.create({ data: { userId: user.id, vehicleId } }),
    prisma.vehicle.update({
      where: { id: vehicleId },
      data: { favoriteCount: { increment: 1 } },
    }),
  ]);
  revalidatePath('/favorites');
  return ok({ favorited: true });
}
