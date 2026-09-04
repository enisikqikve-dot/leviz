import { prisma } from '@/lib/db';
import type { Locale } from '@/lib/i18n/routing';

import type { FilterData } from './components/filter-types';
import { countByBrand } from './queries';
import type { SearchParams } from './schema';

const FEATURE_NAME: Record<Locale, 'nameSq' | 'nameDe' | 'nameEn'> = {
  sq: 'nameSq', de: 'nameDe', en: 'nameEn',
};
const COUNTRY_NAME: Record<Locale, 'nameSq' | 'nameDe' | 'nameEn'> = {
  sq: 'nameSq', de: 'nameDe', en: 'nameEn',
};

/**
 * Auswahllisten für die Filter. Die Markenzählung richtet sich nach den übrigen
 * Filtern, damit keine Kombination angeboten wird, die null Treffer liefert.
 */
export async function loadFilterData(
  params: SearchParams,
  locale: Locale,
): Promise<FilterData> {
  const [brandCounts, models, cities, countries, features] = await Promise.all([
    countByBrand(params, 60),

    params.make
      ? prisma.model.findMany({
          where: { brand: { slug: params.make } },
          select: { slug: true, name: true },
          orderBy: [{ popular: 'desc' }, { name: 'asc' }],
        })
      : Promise.resolve([]),

    prisma.city.findMany({
      where: { country: { isCoreMarket: true } },
      select: { slug: true, name: true, country: { select: { code: true } } },
      orderBy: [{ population: 'desc' }],
      take: 60,
    }),

    prisma.country.findMany({
      where: { isImportOrigin: true },
      select: { code: true, nameSq: true, nameDe: true, nameEn: true },
      orderBy: { sortOrder: 'asc' },
    }),

    prisma.feature.findMany({
      select: { slug: true, nameSq: true, nameDe: true, nameEn: true, group: true, popular: true },
      orderBy: [{ popular: 'desc' }, { sortOrder: 'asc' }],
    }),
  ]);

  return {
    brands: brandCounts.map((brand) => ({
      slug: brand.slug, name: brand.name, count: brand.count,
    })),
    models,
    cities: cities.map((city) => ({
      slug: city.slug, name: city.name, countryCode: city.country.code,
    })),
    countries: countries.map((country) => ({
      code: country.code, name: country[COUNTRY_NAME[locale]],
    })),
    features: features.map((feature) => ({
      slug: feature.slug,
      label: feature[FEATURE_NAME[locale]],
      group: feature.group,
      popular: feature.popular,
    })),
  };
}

/** Der im Verwaltungsbereich hinterlegte Euro-Lek-Kurs. */
export async function getEurToAllRate(): Promise<number> {
  const setting = await prisma.platformSetting.findUnique({
    where: { key: 'currency.eurToAll' },
    select: { value: true },
  });

  return typeof setting?.value === 'number' ? setting.value : 100.5;
}
