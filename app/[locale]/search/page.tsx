import type { Metadata } from 'next';
import { SearchX } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Button } from '@/components/ui/button';
import { getCompareIds } from '@/features/compare/server';
import { getFavoriteIds } from '@/features/favorites/queries';
import { FilterDrawer } from '@/features/search/components/filter-drawer';
import { FilterPanel } from '@/features/search/components/filter-panel';
import { Pagination } from '@/features/search/components/pagination';
import { SortSelect } from '@/features/search/components/sort-select';
import { getEurToAllRate, loadFilterData } from '@/features/search/data';
import { SaveSearchDialog } from '@/features/searches/components/save-search-dialog';
import { suggestSearchName } from '@/features/searches/name';
import { searchVehicles } from '@/features/search/queries';
import { countActiveFilters, parseSearchParams, toQueryString } from '@/features/search/schema';
import { VehicleCard } from '@/features/vehicles/components/vehicle-card';
import { formatNumber, formatPrice } from '@/lib/currency';
import { getCurrency } from '@/lib/currency-server';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'search' });

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    // Gefilterte Ergebnislisten gehoeren nicht in den Suchindex; die
    // Fahrzeugseiten selbst schon.
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const query = parseSearchParams(await searchParams);
  const t = await getTranslations('search');

  const [result, filterData, currency, eurToAll] = await Promise.all([
    searchVehicles(query),
    loadFilterData(query, locale as Locale),
    getCurrency(),
    getEurToAllRate(),
  ]);

  const [favorites, compareIds] = await Promise.all([
    getFavoriteIds(result.items.map((item) => item.id)),
    getCompareIds(),
  ]);
  const compare = new Set(compareIds);
  const hasResults = result.items.length > 0;

  // Vorschlag für den Namen des Suchauftrags aus den gesetzten Filtern.
  const tv = await getTranslations('vehicles');
  const suggestedName = suggestSearchName(query, {
    brand: filterData.brands.find((brand) => brand.slug === query.make)?.name,
    model: filterData.models.find((model) => model.slug === query.model)?.name,
    city: filterData.cities.find((city) => city.slug === query.city)?.name,
    fuel: (value) => tv(`fuel.${value}`),
    transmission: (value) => tv(`transmission.${value}`),
    body: (value) => tv(`body.${value}`),
    customs: (value) => tv(`customs.${value}`),
    price: (eur) => formatPrice(eur * 100, { currency: 'EUR', locale: locale as Locale }),
    upTo: t('fields.priceTo'),
    from: t('fields.priceFrom'),
  });

  return (
    <div className="lv-container py-8">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('title')}</h1>

      <div className="mt-6 lg:grid lg:grid-cols-[17rem_1fr] lg:items-start lg:gap-8">
        {/* Auf dem Desktop dauerhaft sichtbar, auf Mobilgeraeten in der Schublade. */}
        <aside className="bg-card text-card-foreground sticky top-20 hidden max-h-[calc(100dvh-6rem)] rounded-xl border p-4 lg:block">
          <FilterPanel params={query} data={filterData} />
        </aside>

        <div className="min-w-0">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <FilterDrawer params={query} data={filterData} />
              <p className="text-muted-foreground text-sm" aria-live="polite">
                {result.total === 1
                  ? t('resultsOne')
                  : t('resultsMany', { count: formatNumber(result.total, locale as Locale) })}
                {result.center ? ` · ${result.center.name} +${result.center.radiusKm} km` : null}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <SaveSearchDialog
                query={toQueryString(query)}
                suggestedName={suggestedName}
                disabled={countActiveFilters(query) === 0}
              />
              <SortSelect params={query} hasCenter={Boolean(result.center)} />
            </div>
          </header>

          {hasResults ? (
            <>
              <ul className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {result.items.map((vehicle, index) => (
                  <li key={vehicle.id}>
                    <VehicleCard
                      vehicle={vehicle}
                      locale={locale as Locale}
                      currency={currency}
                      eurToAll={eurToAll}
                      favorited={favorites.has(vehicle.id)}
                      inCompare={compare.has(vehicle.id)}
                      priority={index < 3}
                    />
                  </li>
                ))}
              </ul>

              <Pagination params={query} page={result.page} pageCount={result.pageCount} />
            </>
          ) : (
            <div className="bg-surface mt-5 flex flex-col items-center rounded-xl border px-6 py-20 text-center">
              <span className="bg-muted text-muted-foreground inline-flex size-14 items-center justify-center rounded-full">
                <SearchX className="size-7" aria-hidden />
              </span>
              <h2 className="mt-6 text-lg font-semibold">{t('noResults')}</h2>
              <p className="text-muted-foreground mt-2 max-w-sm text-sm">
                {t('noResultsHint')}
              </p>
              <Button asChild variant="outline" size="lg" className="mt-6">
                <Link href="/search">{t('clearFilters')}</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
