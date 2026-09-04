import type { SearchParams } from '@/features/search/schema';

export type LabelLookup = {
  brand?: string;
  model?: string;
  city?: string;
  fuel: (value: string) => string;
  transmission: (value: string) => string;
  body: (value: string) => string;
  customs: (value: string) => string;
  price: (eur: number) => string;
  upTo: string;
  from: string;
};

const MAX_PARTS = 4;

/**
 * Vorschlag für den Namen eines Suchauftrags aus den gesetzten Filtern.
 *
 * Ein leeres Namensfeld führt erfahrungsgemäß zu Einträgen wie "Suche 1", die
 * später niemand mehr zuordnen kann. Der Vorschlag nennt darum die Filter, die
 * den Auftrag tatsächlich unterscheiden — Marke und Preis zuerst.
 */
export function suggestSearchName(
  params: SearchParams,
  labels: LabelLookup,
): string {
  const parts: string[] = [];

  if (labels.brand) parts.push(labels.brand);
  if (labels.model) parts.push(labels.model);

  if (params.fuel?.length === 1) parts.push(labels.fuel(params.fuel[0]));
  if (params.transmission?.length === 1) {
    parts.push(labels.transmission(params.transmission[0]));
  }
  if (params.bodyType?.length === 1) parts.push(labels.body(params.bodyType[0]));
  if (params.customs?.length === 1) parts.push(labels.customs(params.customs[0]));

  if (params.priceMax !== undefined) {
    parts.push(`${labels.upTo} ${labels.price(params.priceMax)}`);
  } else if (params.priceMin !== undefined) {
    parts.push(`${labels.from} ${labels.price(params.priceMin)}`);
  }

  if (labels.city) parts.push(labels.city);
  if (params.q) parts.unshift(params.q);

  return parts.slice(0, MAX_PARTS).join(' · ');
}
