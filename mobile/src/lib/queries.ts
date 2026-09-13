import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from './api';
import type {
  Catalog, ListingDetail, ListingFormValues, ListingOptions, Notification, OwnListing, Profile,
  PublishResult, SaveResult, SearchResponse, VehicleResponse, VehicleCard,
} from './types';

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

// --- Phase 2: eigene Inserate, Fotos, Profil --------------------------------

/** "Meine Inserate" -- dieselbe Liste wie im Dashboard der Website. */
export function useMyListings(enabled: boolean) {
  return useQuery({
    queryKey: ['my-listings'],
    queryFn: () => api<{ items: OwnListing[] }>('/listings'),
    enabled,
  });
}

/** Ein eigenes Inserat in der Form des Assistenten, zum Bearbeiten. */
export function useListing(id: string | undefined) {
  return useQuery({
    queryKey: ['listing', id],
    queryFn: () => api<ListingDetail>(`/listings/${id}`),
    enabled: Boolean(id),
  });
}

/** Marken, Staedte, Herkunftslaender, Ausstattung -- und die Fotogrenze des Pakets. */
export function useListingOptions(locale: string, enabled: boolean) {
  return useQuery({
    queryKey: ['listing-options', locale],
    queryFn: () => api<ListingOptions>(`/listings/options?locale=${locale}`),
    staleTime: 10 * 60_000,
    enabled,
  });
}

/** Anlegen oder aktualisieren; danach die Listen frisch holen. */
export function useSaveListing() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ values, id }: { values: Partial<ListingFormValues>; id?: string }) =>
      id
        ? api<SaveResult>(`/listings/${id}`, { method: 'PUT', body: values })
        : api<SaveResult>('/listings', { method: 'POST', body: values }),
    onSuccess: (_, { id }) => {
      client.invalidateQueries({ queryKey: ['my-listings'] });
      if (id) client.invalidateQueries({ queryKey: ['listing', id] });
    },
  });
}

export type ListingCommand = 'publish' | 'pause' | 'sold' | 'delete';

/**
 * Veroeffentlichen, pausieren, verkauft, loeschen. Danach alles neu laden,
 * was das Inserat zeigen koennte -- auch die oeffentliche Suche, denn ein
 * pausiertes Fahrzeug verschwindet dort.
 */
export function useListingCommand() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, command }: { id: string; command: ListingCommand }) => {
      if (command === 'delete') {
        await api(`/listings/${id}`, { method: 'DELETE' });
        return null;
      }
      return api<PublishResult | { status: 'ACTIVE' | 'PAUSED' } | undefined>(`/listings/${id}/${command}`, { method: 'POST' });
    },
    onSuccess: (_, { id }) => {
      client.invalidateQueries({ queryKey: ['my-listings'] });
      client.invalidateQueries({ queryKey: ['listing', id] });
      client.invalidateQueries({ queryKey: ['vehicles'] });
      client.invalidateQueries({ queryKey: ['home'] });
    },
  });
}

export function useProfile(enabled: boolean) {
  return useQuery({
    queryKey: ['profile'],
    queryFn: () => api<Profile>('/me/profile'),
    enabled,
  });
}

/** Profil speichern; die Antwort ist schon das neue Profil, /me wird nachgeladen. */
export function useUpdateProfile() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; phone: string | null; citySlug?: string; locale: string }) =>
      api<Profile>('/me/profile', { method: 'PATCH', body: input }),
    onSuccess: (profil) => {
      client.setQueryData(['profile'], profil);
      client.invalidateQueries({ queryKey: ['me'] });
    },
  });
}

// --- Phase 3: Meldungen -----------------------------------------------------

export type NotificationsPage = { items: Notification[]; unread: number; nextCursor: string | null };

/** Die eigenen Meldungen, neueste zuerst, seitenweise -- und die Zahl der ungelesenen. */
export function useNotifications(enabled: boolean) {
  return useInfiniteQuery({
    queryKey: ['notifications'],
    queryFn: ({ pageParam }) => api<NotificationsPage>(`/notifications?limit=30${pageParam ? `&cursor=${pageParam}` : ''}`),
    initialPageParam: '' as string,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled,
    // Beim Oeffnen des Bildschirms lieber einmal zu oft fragen als eine
    // Meldung zu spaet zeigen.
    staleTime: 15_000,
  });
}

/** Als gelesen markieren; die Liste und das Abzeichen folgen. */
export function useMarkNotificationRead() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/notifications/${id}/read`, { method: 'POST' }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['notifications'] }),
  });
}
