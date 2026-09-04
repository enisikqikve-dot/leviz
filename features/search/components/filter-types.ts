import type { SearchParams } from '@/features/search/schema';

/** Auswahllisten, die der Server an das Filterpanel uebergibt. */
export type FilterData = {
  brands: { slug: string; name: string; count?: number }[];
  models: { slug: string; name: string }[];
  cities: { slug: string; name: string; countryCode: string }[];
  countries: { code: string; name: string }[];
  features: { slug: string; label: string; group: string; popular: boolean }[];
};

export type FilterUpdate = (changes: Partial<SearchParams>) => void;
