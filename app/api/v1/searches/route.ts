import { saveSearch } from '@/features/searches/core';
import { getSavedSearches } from '@/features/searches/queries';
import { requireApiUser } from '@/lib/api/auth';
import { handle, ok, readJson, unwrap } from '@/lib/api/respond';

/**
 * GET /api/v1/searches -> die eigenen Suchauftraege samt Trefferzahl und
 * der Zahl neuer Treffer seit dem letzten Ansehen -- dieselbe Abfrage wie
 * die Seite auf der Website.
 */
export const GET = handle(async (request) => {
  const user = await requireApiUser(request);
  const items = await getSavedSearches(user.id);

  return ok({
    items: items.map((s) => ({
      id: s.id,
      name: s.name,
      query: s.query,
      filterCount: s.filterCount,
      notifyByEmail: s.notifyByEmail,
      createdAt: s.createdAt,
      lastCheckedAt: s.lastCheckedAt,
      matchCount: s.matchCount,
      newCount: s.newCount,
    })),
  });
});

/**
 * POST /api/v1/searches { name, query, notifyByEmail? } -> speichern (201).
 * `query` ist die Adresszeile der Suche als Objekt -- genau die Parameter,
 * die auch GET /vehicles nimmt. Hoechstens 25, mindestens ein Filter.
 */
export const POST = handle(async (request) => {
  const user = await requireApiUser(request);
  return ok(unwrap(await saveSearch(user.id, await readJson(request))), { status: 201 });
});
