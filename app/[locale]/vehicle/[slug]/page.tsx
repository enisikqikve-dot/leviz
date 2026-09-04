import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { FavoriteButton } from '@/features/favorites/components/favorite-button';
import { getFavoriteIds } from '@/features/favorites/queries';
import { ReportDialog } from '@/features/reports/components/report-dialog';
import { getEurToAllRate } from '@/features/search/data';
import { VehicleGallery } from '@/features/vehicles/components/gallery';
import { SellerCard } from '@/features/vehicles/components/seller-card';
import { ShareButton } from '@/features/vehicles/components/share-button';
import { SpecList } from '@/features/vehicles/components/spec-list';
import { VehicleJsonLd } from '@/features/vehicles/components/vehicle-json-ld';
import { VehicleSection } from '@/features/home/components/vehicle-section';
import { getSimilarVehicles, getVehicleBySlug, recordView } from '@/features/vehicles/queries';
import { getSessionUser } from '@/lib/auth/guards';
import { getCurrency } from '@/lib/currency-server';
import { formatMileage, formatPrice } from '@/lib/currency';
import { getPathname } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import { routing } from '@/lib/i18n/routing';
import { siteConfig } from '@/lib/site';

import { VehicleHeader } from './vehicle-header';

type PageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const vehicle = await getVehicleBySlug(slug);

  if (!vehicle) return { title: 'LEVIZ' };

  const t = await getTranslations({ locale, namespace: 'vehicles' });
  const year = vehicle.firstRegistration?.getFullYear();
  const price = formatPrice(vehicle.priceCents, { currency: 'EUR', locale: locale as Locale });

  const description = [
    vehicle.title,
    year,
    vehicle.mileageKm !== null ? formatMileage(vehicle.mileageKm, locale as Locale) : null,
    vehicle.fuel ? t(`fuel.${vehicle.fuel}`) : null,
    price,
    vehicle.city?.name,
    vehicle.customsStatus !== 'NOT_APPLICABLE' ? t(`customs.${vehicle.customsStatus}`) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const path = getPathname({
    href: { pathname: '/vehicle/[slug]', params: { slug } },
    locale: locale as Locale,
  });

  // Jede Sprachfassung verweist auf die anderen, damit Google die richtige
  // Version im jeweiligen Markt ausspielt.
  const languages = Object.fromEntries(
    routing.locales.map((other) => [
      other,
      `${siteConfig.url}${getPathname({ href: { pathname: '/vehicle/[slug]', params: { slug } }, locale: other })}`,
    ]),
  );

  return {
    title: `${vehicle.title} – ${price}`,
    description,
    alternates: { canonical: `${siteConfig.url}${path}`, languages },
    openGraph: {
      type: 'website',
      title: vehicle.title,
      description,
      url: `${siteConfig.url}${path}`,
      images: vehicle.images.slice(0, 3).map((image) => ({ url: image.url })),
    },
  };
}

export default async function VehiclePage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const vehicle = await getVehicleBySlug(slug);
  if (!vehicle) notFound();

  const td = await getTranslations('vehicleDetail');

  const [viewer, currency, eurToAll, similar] = await Promise.all([
    getSessionUser(),
    getCurrency(),
    getEurToAllRate(),
    getSimilarVehicles(vehicle),
  ]);

  const favorites = await getFavoriteIds([vehicle.id]);

  // Der Zähler darf den Seitenaufbau nicht aufhalten.
  void recordView({ vehicleId: vehicle.id, userId: viewer?.id });

  const path = getPathname({
    href: { pathname: '/vehicle/[slug]', params: { slug } },
    locale: locale as Locale,
  });

  return (
    <>
      <VehicleJsonLd vehicle={vehicle} url={`${siteConfig.url}${path}`} />

      <div className="lv-container py-6 sm:py-8">
        <div className="lg:grid lg:grid-cols-[1fr_22rem] lg:items-start lg:gap-8">
          <div className="min-w-0">
            <VehicleGallery
              images={vehicle.images.map((image) => ({
                id: image.id, url: image.url, altText: image.altText,
              }))}
              title={vehicle.title}
            />

            <VehicleHeader
              vehicle={vehicle}
              locale={locale as Locale}
              currency={currency}
              eurToAll={eurToAll}
            />

            {vehicle.description ? (
              <section className="mt-10">
                <h2 className="text-lg font-semibold">{td('sections.description')}</h2>
                <p className="text-muted-foreground mt-3 leading-relaxed whitespace-pre-line">
                  {vehicle.description}
                </p>
              </section>
            ) : null}

            <div className="mt-10">
              <SpecList vehicle={vehicle} locale={locale as Locale} />
            </div>

            {vehicle.features.length > 0 ? (
              <section className="mt-10">
                <h2 className="text-lg font-semibold">{td('sections.equipment')}</h2>
                <ul className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
                  {vehicle.features.map(({ feature }) => (
                    <li key={feature.slug} className="text-sm">
                      <span className="text-success me-2" aria-hidden>✓</span>
                      {locale === 'de' ? feature.nameDe : locale === 'en' ? feature.nameEn : feature.nameSq}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>

          {/* Verkäuferbox bleibt beim Scrollen stehen. */}
          <aside className="mt-8 lg:sticky lg:top-20 lg:mt-0">
            <SellerCard vehicle={vehicle} locale={locale as Locale} viewer={viewer} />

            <div className="mt-3 flex gap-2">
              <div className="flex-1">
                <ShareButton title={vehicle.title} />
              </div>
              <FavoriteButton
                vehicleId={vehicle.id}
                initialFavorited={favorites.has(vehicle.id)}
                className="size-11 border"
              />
            </div>

            {/* Melden steht bewusst unauffällig, aber immer erreichbar. */}
            <div className="mt-4 text-center">
              <ReportDialog vehicleId={vehicle.id} />
            </div>
          </aside>
        </div>
      </div>

      {similar.length > 0 ? (
        <div className="bg-surface border-t">
          <VehicleSection
            title={td('sections.similar')}
            subtitle=""
            allLabel=""
            allHref={{ make: vehicle.brand.slug }}
            vehicles={similar}
            locale={locale as Locale}
            currency={currency}
            eurToAll={eurToAll}
          />
        </div>
      ) : null}
    </>
  );
}
