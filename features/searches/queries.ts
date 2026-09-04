import { buildWhere } from '@/features/search/queries';
import { countActiveFilters, searchSchema, type SearchParams } from '@/features/search/schema';
import { prisma } from '@/lib/db';

export type SavedSearchRow = {
  id: string;
  name: string;
  query: Record<string, string>;
  filters: SearchParams;
  filterCount: number;
  notifyByEmail: boolean;
  createdAt: Date;
  lastCheckedAt: Date | null;
  matchCount: number;
  newCount: number;
};

/**
 * Suchaufträge eines Nutzers samt aktueller Trefferzahl.
 *
 * `newCount` zählt nur Fahrzeuge, die seit dem letzten Ansehen veröffentlicht
 * wurden — das ist die Zahl, die den Nutzer wirklich interessiert.
 */
export async function getSavedSearches(userId: string): Promise<SavedSearchRow[]> {
  const searches = await prisma.savedSearch.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  return Promise.all(
    searches.map(async (search) => {
      const query = (search.query ?? {}) as Record<string, string>;
      const filters = searchSchema.parse(query);
      const where = buildWhere(filters);

      const [matchCount, newCount] = await Promise.all([
        prisma.vehicle.count({ where }),
        search.lastCheckedAt
          ? prisma.vehicle.count({
              where: { ...where, publishedAt: { gt: search.lastCheckedAt } },
            })
          : Promise.resolve(0),
      ]);

      return {
        id: search.id,
        name: search.name,
        query,
        filters,
        filterCount: countActiveFilters(filters),
        notifyByEmail: search.notifyByEmail,
        createdAt: search.createdAt,
        lastCheckedAt: search.lastCheckedAt,
        matchCount,
        newCount,
      };
    }),
  );
}

/**
 * Suchaufträge, für die neue Treffer vorliegen — Grundlage der späteren
 * E-Mail-Benachrichtigung. Wird von einem geplanten Lauf aufgerufen; die
 * Zustellung selbst hängt an `lib/email`.
 */
export async function findSearchesWithNewMatches(limit = 200) {
  const searches = await prisma.savedSearch.findMany({
    where: { notifyByEmail: true, lastCheckedAt: { not: null } },
    orderBy: { lastNotifiedAt: 'asc' },
    take: limit,
    include: { user: { select: { id: true, email: true, name: true, locale: true } } },
  });

  const results = [];

  for (const search of searches) {
    const filters = searchSchema.parse((search.query ?? {}) as Record<string, string>);
    const where = buildWhere(filters);

    const matches = await prisma.vehicle.count({
      where: { ...where, publishedAt: { gt: search.lastCheckedAt! } },
    });

    if (matches > 0) results.push({ search, matches });
  }

  return results;
}
