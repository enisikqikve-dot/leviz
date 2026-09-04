import { prisma } from '@/lib/db';
import type { Locale } from '@/lib/i18n/routing';

import type { WizardData } from './components/types';

const NAME_FIELD: Record<Locale, 'nameSq' | 'nameDe' | 'nameEn'> = {
  sq: 'nameSq', de: 'nameDe', en: 'nameEn',
};

/** Auswahllisten für den Inserat-Assistenten. */
export async function loadWizardData(locale: Locale): Promise<WizardData> {
  const [brands, cities, countries, features] = await Promise.all([
    prisma.brand.findMany({
      select: { slug: true, name: true },
      orderBy: [{ popular: 'desc' }, { name: 'asc' }],
    }),
    prisma.city.findMany({
      where: { country: { isCoreMarket: true } },
      select: { slug: true, name: true, country: { select: { code: true } } },
      orderBy: [{ country: { sortOrder: 'asc' } }, { population: 'desc' }],
    }),
    prisma.country.findMany({
      where: { isImportOrigin: true },
      select: { code: true, nameSq: true, nameDe: true, nameEn: true },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.feature.findMany({
      select: { slug: true, nameSq: true, nameDe: true, nameEn: true, group: true },
      orderBy: [{ group: 'asc' }, { sortOrder: 'asc' }],
    }),
  ]);

  return {
    brands,
    cities: cities.map((city) => ({
      slug: city.slug, name: city.name, countryCode: city.country.code,
    })),
    importCountries: countries.map((country) => ({
      code: country.code, name: country[NAME_FIELD[locale]],
    })),
    features: features.map((feature) => ({
      slug: feature.slug,
      label: feature[NAME_FIELD[locale]],
      group: feature.group,
    })),
  };
}
