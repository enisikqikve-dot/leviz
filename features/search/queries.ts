import type { Prisma } from '@/lib/generated/prisma/client';
import { boundingBox, haversineKm } from '@/lib/geo/distance';
import { prisma } from '@/lib/db';

import { PAGE_SIZE, type SearchParams, type SortOption } from './schema';

/** Nur veroeffentlichte Inserate erscheinen in der Suche. */
const VISIBLE: Prisma.VehicleWhereInput = { status: 'ACTIVE' };

function between(min?: number, max?: number) {
  if (min === undefined && max === undefined) return undefined;
  return {
    ...(min !== undefined ? { gte: min } : {}),
    ...(max !== undefined ? { lte: max } : {}),
  };
}

function yearRange(min?: number, max?: number) {
  if (min === undefined && max === undefined) return undefined;
  return {
    ...(min !== undefined ? { gte: new Date(min, 0, 1) } : {}),
    ...(max !== undefined ? { lte: new Date(max, 11, 31, 23, 59, 59) } : {}),
  };
}

const some = <T>(values: T[] | undefined) =>
  values && values.length > 0 ? { in: values } : undefined;

export type ResolvedCenter = { lat: number; lng: number; name: string; radiusKm: number };

/**
 * Uebersetzt die Filter aus der Adresszeile in eine Prisma-Bedingung.
 * Nicht gesetzte Filter fallen ersatzlos weg, damit die Abfrage die
 * Verbundindizes auf (status, marke, modell, preis) auch wirklich nutzen kann.
 */
export function buildWhere(
  params: SearchParams,
  center?: ResolvedCenter,
): Prisma.VehicleWhereInput {
  const where: Prisma.VehicleWhereInput = { ...VISIBLE };
  const and: Prisma.VehicleWhereInput[] = [];

  if (params.q) {
    // Freitext trifft Titel und Beschreibung; die Marken- und Modellnamen
    // stecken bereits im Titel.
    and.push({
      OR: [
        { title: { contains: params.q, mode: 'insensitive' } },
        { description: { contains: params.q, mode: 'insensitive' } },
      ],
    });
  }

  if (params.category) where.category = params.category;
  if (params.make) where.brand = { slug: params.make };
  if (params.model) where.model = { slug: params.model };
  if (params.condition) where.condition = params.condition;

  const price = between(
    params.priceMin !== undefined ? params.priceMin * 100 : undefined,
    params.priceMax !== undefined ? params.priceMax * 100 : undefined,
  );
  if (price) where.priceCents = price;

  const mileage = between(params.mileageMin, params.mileageMax);
  if (mileage) where.mileageKm = mileage;

  const registration = yearRange(params.yearMin, params.yearMax);
  if (registration) where.firstRegistration = registration;

  const power = between(params.powerMin, params.powerMax);
  if (power) where.powerKw = power;

  where.fuel = some(params.fuel);
  where.transmission = some(params.transmission);
  where.bodyType = some(params.bodyType);
  where.driveType = some(params.driveType);
  where.emissionClass = some(params.emissionClass);
  where.color = some(params.color);
  where.customsStatus = some(params.customs);
  where.plateOrigin = some(params.plates);

  if (params.doors !== undefined) where.doors = params.doors;
  if (params.seats !== undefined) where.seats = { gte: params.seats };
  if (params.co2Max !== undefined) where.co2Gkm = { lte: params.co2Max };
  if (params.rangeMin !== undefined) where.electricRangeKm = { gte: params.rangeMin };
  if (params.steering) where.steeringSide = params.steering;

  if (params.importedFrom && params.importedFrom.length > 0) {
    and.push({ importedFrom: { code: { in: params.importedFrom } } });
  }

  if (params.sellerType) where.sellerType = params.sellerType;
  if (params.dealer) where.dealer = { slug: params.dealer };

  if (params.vat) where.vatDeductible = true;
  if (params.accidentFree) where.accidentFree = true;
  if (params.serviceHistory) where.serviceHistory = true;
  if (params.financing) where.financingAvailable = true;
  if (params.leasing) where.leasingAvailable = true;
  if (params.warranty) where.warrantyMonths = { gt: 0 };

  // Ausstattung: jedes gewaehlte Merkmal muss vorhanden sein.
  if (params.features && params.features.length > 0) {
    for (const slug of params.features) {
      and.push({ features: { some: { feature: { slug } } } });
    }
  }

  if (center) {
    // Umschliessendes Rechteck als Vorfilter ueber den Index auf lat/lng.
    // Die exakte Kreisform stellt danach der Haversine-Vergleich her.
    const box = boundingBox(center, center.radiusKm);
    and.push({
      lat: { gte: box.minLat, lte: box.maxLat },
      lng: { gte: box.minLng, lte: box.maxLng },
    });
  } else if (params.city) {
    and.push({ city: { slug: params.city } });
  } else if (params.country) {
    and.push({ country: { code: params.country.toUpperCase() } });
  }

  if (and.length > 0) where.AND = and;

  return where;
}

/**
 * Sortierung. Die Voreinstellung nutzt den vorberechneten Rangwert, damit die
 * Reihung ueber einen Index laeuft und nicht zur Laufzeit gerechnet wird.
 */
export function buildOrderBy(
  sort: SortOption | undefined,
): Prisma.VehicleOrderByWithRelationInput[] {
  switch (sort) {
    case 'newest':
      return [{ publishedAt: 'desc' }, { id: 'desc' }];
    case 'priceAsc':
      return [{ priceCents: 'asc' }, { id: 'asc' }];
    case 'priceDesc':
      return [{ priceCents: 'desc' }, { id: 'desc' }];
    case 'mileageAsc':
      return [{ mileageKm: 'asc' }, { id: 'asc' }];
    case 'yearDesc':
      return [{ firstRegistration: 'desc' }, { id: 'desc' }];
    case 'distance':
      // Die Entfernung wird nach dem Laden berechnet; hier nur ein stabiler
      // Ausgangszustand, damit die Reihenfolge reproduzierbar bleibt.
      return [{ rankScore: 'desc' }, { id: 'desc' }];
    case 'relevance':
    default:
      return [{ rankScore: 'desc' }, { publishedAt: 'desc' }, { id: 'desc' }];
  }
}

export const CARD_SELECT = {
  id: true, slug: true, title: true, modelId: true,
  priceCents: true, negotiable: true,
  mileageKm: true, firstRegistration: true,
  fuel: true, transmission: true, powerKw: true, bodyType: true, driveType: true,
  condition: true, customsStatus: true, plateOrigin: true,
  sellerType: true, featuredScore: true, qualityScore: true,
  publishedAt: true, createdAt: true,
  lat: true, lng: true,
  brand: { select: { name: true, slug: true } },
  model: { select: { name: true, slug: true } },
  city: { select: { name: true, slug: true } },
  country: { select: { code: true, nameSq: true, nameDe: true, nameEn: true } },
  dealer: { select: { companyName: true, slug: true, verification: true } },
  images: {
    select: { url: true, altText: true },
    orderBy: { position: 'asc' as const },
    take: 1,
  },
} satisfies Prisma.VehicleSelect;

export type VehicleCard = Prisma.VehicleGetPayload<{ select: typeof CARD_SELECT }> & {
  distanceKm?: number;
};

export type SearchResult = {
  items: VehicleCard[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
  center?: ResolvedCenter;
};

/** Loest Stadt und Radius in Koordinaten auf. */
export async function resolveCenter(
  citySlug: string | undefined,
  radiusKm: number | undefined,
): Promise<ResolvedCenter | undefined> {
  if (!citySlug || !radiusKm || radiusKm <= 0) return undefined;

  const city = await prisma.city.findFirst({
    where: { slug: citySlug },
    select: { name: true, lat: true, lng: true },
  });

  if (!city) return undefined;
  return { lat: city.lat, lng: city.lng, name: city.name, radiusKm };
}

/**
 * Umkreissuche in zwei Schritten: Das umschliessende Rechteck steckt schon in
 * der Bedingung und nutzt den Index; hier wird die Trefferliste auf die exakte
 * Kreisform verkleinert.
 *
 * Fuer den aktuellen Bestand ist das unmerklich. Waechst er in die
 * Hunderttausende, wandert dieser Schritt in eine SQL-Abfrage mit
 * Entfernungsausdruck — die Schnittstelle dieser Funktion bleibt gleich.
 */
async function searchWithinRadius(
  where: Prisma.VehicleWhereInput,
  center: ResolvedCenter,
  sort: SortOption | undefined,
  page: number,
  pageSize: number,
): Promise<SearchResult> {
  const candidates = await prisma.vehicle.findMany({
    where,
    select: { id: true, lat: true, lng: true },
  });

  const withDistance = candidates
    .map((candidate) => {
      if (candidate.lat === null || candidate.lng === null) return null;
      const distanceKm = haversineKm(center, { lat: candidate.lat, lng: candidate.lng });
      return distanceKm <= center.radiusKm ? { id: candidate.id, distanceKm } : null;
    })
    .filter((entry): entry is { id: string; distanceKm: number } => entry !== null);

  const total = withDistance.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);

  const ordered =
    sort === 'distance'
      ? withDistance.sort((a, b) => a.distanceKm - b.distanceKm)
      : withDistance;

  const pageIds = ordered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const distanceById = new Map(pageIds.map((entry) => [entry.id, entry.distanceKm]));

  const rows = await prisma.vehicle.findMany({
    where: { id: { in: pageIds.map((entry) => entry.id) } },
    select: CARD_SELECT,
    orderBy: sort === 'distance' ? undefined : buildOrderBy(sort),
  });

  const items = rows.map((row) => ({ ...row, distanceKm: distanceById.get(row.id) }));

  // Bei Sortierung nach Entfernung die Reihenfolge der Kennungen beibehalten.
  if (sort === 'distance') {
    const position = new Map(pageIds.map((entry, index) => [entry.id, index]));
    items.sort((a, b) => (position.get(a.id) ?? 0) - (position.get(b.id) ?? 0));
  }

  return { items, total, page: safePage, pageCount, pageSize, center };
}

export async function searchVehicles(
  params: SearchParams,
  options: { pageSize?: number } = {},
): Promise<SearchResult> {
  const pageSize = options.pageSize ?? PAGE_SIZE;
  const page = params.page ?? 1;

  const center = await resolveCenter(params.city, params.radius);
  const where = buildWhere(params, center);

  if (center) {
    return searchWithinRadius(where, center, params.sort, page, pageSize);
  }

  const [total, items] = await Promise.all([
    prisma.vehicle.count({ where }),
    prisma.vehicle.findMany({
      where,
      select: CARD_SELECT,
      orderBy: buildOrderBy(params.sort),
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return { items, total, page: Math.min(page, pageCount), pageCount, pageSize };
}

/** Zaehlt, wie viele Fahrzeuge je Marke zu den restlichen Filtern passen. */
/**
 * Alle Marken für die Auswahlliste, die mit Treffern zuerst.
 *
 * Frueher standen hier ausschliesslich Marken mit Inseraten — damit keine
 * Kombination angeboten wird, die null Treffer liefert. Auf einem laufenden
 * Marktplatz ist das richtig; auf einem neuen sieht der Filter dadurch kaputt
 * aus: er bietet nur „Jede Marke" an, und der Besucher schliesst daraus, dass
 * die Seite nicht funktioniert.
 *
 * Deshalb erscheint jede Marke. Wo es Inserate gibt, steht die Zahl daneben;
 * wo nicht, steht die Marke ohne Zahl. Wer sie waehlt, bekommt eine ehrliche
 * leere Trefferliste statt einer Auswahl, die es nicht gibt.
 */
export async function countByBrand(params: SearchParams, limit = 12) {
  const where = buildWhere({ ...params, make: undefined, model: undefined });

  const [grouped, brands] = await Promise.all([
    prisma.vehicle.groupBy({
      by: ['brandId'],
      where,
      _count: { _all: true },
      orderBy: { _count: { brandId: 'desc' } },
      take: limit,
    }),
    prisma.brand.findMany({
      select: { id: true, name: true, slug: true },
      orderBy: [{ popular: 'desc' }, { name: 'asc' }],
    }),
  ]);

  const countById = new Map(grouped.map((entry) => [entry.brandId, entry._count._all]));

  return brands
    .map((brand) => ({ ...brand, count: countById.get(brand.id) ?? 0 }))
    .sort((a, b) => {
      // Marken mit Treffern zuerst, darin die haeufigste oben. Der Rest
      // behaelt die Reihenfolge aus der Datenbank: beliebte Marken vorn,
      // sonst alphabetisch.
      if (a.count !== b.count) return b.count - a.count;
      return 0;
    });
}
