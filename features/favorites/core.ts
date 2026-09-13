import { prisma } from '@/lib/db';

/**
 * Merken und Vergessen -- ein Weg fuer Website und App.
 *
 * Der Zaehler am Fahrzeug wandert in derselben Klammer mit: sonst zeigt eine
 * Karte "12 Mal gemerkt", waehrend es elf sind.
 */
export type FavoriteOutcome = 'added' | 'removed' | 'unchanged' | 'vehicle-missing';

export async function setFavorite(
  userId: string,
  vehicleId: string,
  favorited: boolean,
): Promise<FavoriteOutcome> {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    select: { id: true },
  });
  if (!vehicle) return 'vehicle-missing';

  const existing = await prisma.favorite.findUnique({
    where: { userId_vehicleId: { userId, vehicleId } },
    select: { id: true },
  });

  if (favorited && !existing) {
    await prisma.$transaction([
      prisma.favorite.create({ data: { userId, vehicleId } }),
      prisma.vehicle.update({ where: { id: vehicleId }, data: { favoriteCount: { increment: 1 } } }),
    ]);
    return 'added';
  }

  if (!favorited && existing) {
    await prisma.$transaction([
      prisma.favorite.delete({ where: { id: existing.id } }),
      prisma.vehicle.update({ where: { id: vehicleId }, data: { favoriteCount: { decrement: 1 } } }),
    ]);
    return 'removed';
  }

  return 'unchanged';
}

export async function isFavorite(userId: string, vehicleId: string): Promise<boolean> {
  const existing = await prisma.favorite.findUnique({
    where: { userId_vehicleId: { userId, vehicleId } },
    select: { id: true },
  });
  return Boolean(existing);
}
