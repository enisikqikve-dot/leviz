import { prisma } from '@/lib/db';

/** Fahrzeuge des Vergleichs, in der Reihenfolge der Auswahl. */
export async function getCompareVehicles(ids: string[]) {
  if (ids.length === 0) return [];

  const vehicles = await prisma.vehicle.findMany({
    where: { id: { in: ids } },
    include: {
      brand: { select: { name: true } },
      model: { select: { name: true } },
      city: { select: { name: true } },
      importedFrom: { select: { code: true, nameSq: true, nameDe: true, nameEn: true } },
      images: { select: { url: true }, orderBy: { position: 'asc' }, take: 1 },
      features: { select: { feature: { select: { slug: true, nameSq: true, nameDe: true, nameEn: true } } } },
    },
  });

  // Die Reihenfolge der Auswahl beibehalten, nicht die der Datenbank.
  const byId = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]));
  return ids.map((id) => byId.get(id)).filter((vehicle) => vehicle !== undefined);
}

export type CompareVehicle = Awaited<ReturnType<typeof getCompareVehicles>>[number];
