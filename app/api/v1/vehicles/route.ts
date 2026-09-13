import { loadPriceStandings } from '@/features/pricing/queries';
import { searchVehicles } from '@/features/search/queries';
import { parseSearchParams } from '@/features/search/schema';
import { handle, ok } from '@/lib/api/respond';

/**
 * GET /api/v1/vehicles?make=bmw&model=3er&priceTo=20000&page=2 ...
 *
 * Dieselben Filter wie die Suchseite, mit denselben Namen -- die App kann eine
 * Suchadresse der Website eins zu eins uebernehmen. Gesucht wird ueber
 * dieselbe Funktion, mit demselben Ranking; das Marktpreis-Siegel kommt mit.
 */
export const GET = handle(async (request) => {
  const url = new URL(request.url);

  const roh: Record<string, string | string[]> = {};
  for (const key of new Set(url.searchParams.keys())) {
    const werte = url.searchParams.getAll(key);
    roh[key] = werte.length === 1 ? werte[0]! : werte;
  }

  const params = parseSearchParams(roh);
  const result = await searchVehicles(params);

  const standings = await loadPriceStandings(
    result.items.map((item) => ({
      id: item.id,
      modelId: item.modelId,
      priceCents: item.priceCents,
      year: item.firstRegistration ? item.firstRegistration.getFullYear() : null,
      mileageKm: item.mileageKm,
    })),
  );

  return ok({
    items: result.items.map((item) => ({ ...item, standing: standings.get(item.id) ?? null })),
    total: result.total,
    page: result.page,
    pageCount: result.pageCount,
    pageSize: result.pageSize,
    center: result.center ?? null,
  });
});
