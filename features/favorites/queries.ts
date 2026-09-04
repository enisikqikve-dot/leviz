import { getSessionUser } from '@/lib/auth/guards';
import { prisma } from '@/lib/db';

/**
 * Kennungen der gemerkten Fahrzeuge des angemeldeten Nutzers. Wird einmal pro
 * Ergebnisseite geladen, damit nicht jede Karte einzeln nachfragt.
 */
export async function getFavoriteIds(vehicleIds?: string[]): Promise<Set<string>> {
  const user = await getSessionUser();
  if (!user) return new Set();

  const favorites = await prisma.favorite.findMany({
    where: {
      userId: user.id,
      ...(vehicleIds ? { vehicleId: { in: vehicleIds } } : {}),
    },
    select: { vehicleId: true },
  });

  return new Set(favorites.map((favorite) => favorite.vehicleId));
}
