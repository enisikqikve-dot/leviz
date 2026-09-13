import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from './api';
import type { Catalog, SearchResponse, VehicleResponse, VehicleCard } from './types';

/**
 * Die Abfragen der App, an einer Stelle.
 *
 * Jeder Bildschirm ruft eine dieser Funktionen; keiner spricht selbst mit
 * `fetch`. Aendert sich ein Pfad der API, aendert er sich hier.
 */

export type SearchFilters = Record<string, string | undefined>;

function suchpfad(filters: SearchFilters, page: number): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  params.set('page', String(page));
  return `/vehicles?${params.toString()}`;
}

/** Trefferliste, seitenweise nachgeladen beim Scrollen. */
export function useSearch(filters: SearchFilters) {
  return useInfiniteQuery({
    queryKey: ['vehicles', filters],
    queryFn: ({ pageParam }) => api<SearchResponse>(suchpfad(filters, pageParam), { anonymous: true }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.pageCount ? last.page + 1 : undefined),
  });
}

/** Die Startseite: hervorgehobene und neueste Fahrzeuge, je eine Seite. */
export function useHome() {
  return useQuery({
    queryKey: ['home'],
    queryFn: async () => {
      const [neueste, hervorgehoben] = await Promise.all([
        api<SearchResponse>('/vehicles?sort=newest', { anonymous: true }),
        api<SearchResponse>('/vehicles?sort=relevance', { anonymous: true }),
      ]);
      return {
        latest: neueste.items,
        featured: hervorgehoben.items.filter((v) => v.featuredScore > 0).slice(0, 6),
        total: neueste.total,
      };
    },
  });
}

export function useVehicle(slug: string) {
  return useQuery({
    queryKey: ['vehicle', slug],
    queryFn: () => api<VehicleResponse>(`/vehicles/${encodeURIComponent(slug)}`),
    enabled: Boolean(slug),
  });
}

export function useCatalog(locale: string, make?: string) {
  const params = new URLSearchParams({ locale });
  if (make) params.set('make', make);
  return useQuery({
    queryKey: ['catalog', locale, make ?? ''],
    queryFn: () => api<Catalog>(`/catalog?${params.toString()}`, { anonymous: true }),
    staleTime: 10 * 60_000,
  });
}

export function useFavorites(enabled: boolean) {
  return useQuery({
    queryKey: ['favorites'],
    queryFn: () => api<{ items: { savedAt: string; vehicle: VehicleCard }[] }>('/favorites'),
    enabled,
  });
}

/**
 * Merken oder vergessen -- und danach alles neu laden, was das Herz zeigt:
 * die Merkliste, die Fahrzeugseite. Sonst zeigt eine Seite noch das leere
 * Herz, das die andere schon gefuellt hat.
 */
export function useToggleFavorite() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ vehicleId, favorited }: { vehicleId: string; favorited: boolean }) => {
      if (favorited) await api(`/favorites/${vehicleId}`, { method: 'DELETE' });
      else await api('/favorites', { method: 'POST', body: { vehicleId } });
      return !favorited;
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['favorites'] });
      client.invalidateQueries({ queryKey: ['vehicle'] });
    },
  });
}
