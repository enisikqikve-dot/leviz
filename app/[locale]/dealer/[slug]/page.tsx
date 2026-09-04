import type { Metadata } from 'next';
import { ArrowRight, BadgeCheck, MapPin, Star } from 'lucide-react';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getCompareIds } from '@/features/compare/server';
import { DealerContact } from '@/features/dealers/components/dealer-contact';
import { DealerReviews } from '@/features/dealers/components/dealer-reviews';
import { getDealerBySlug } from '@/features/dealers/queries';
import { getFavoriteIds } from '@/features/favorites/queries';
import { getEurToAllRate } from '@/features/search/data';
import { CARD_SELECT } from '@/features/search/queries';
import { VehicleCard } from '@/features/vehicles/components/vehicle-card';
import { formatDate } from '@/features/vehicles/format';
import { getSessionUser } from '@/lib/auth/guards';
import { getCurrency } from '@/lib/currency-server';
import { prisma } from '@/lib/db';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import { siteConfig } from '@/lib/site';

type PageProps = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const dealer = await getDealerBySlug(slug);
  if (!dealer) return { title: siteConfig.name };

  const t = await getTranslations({ locale, namespace: 'dealers' });

  return {
    title: dealer.companyName,
    description:
      dealer.description?.slice(0, 160) ?? t('vehicles', { count: dealer._count.vehicles }),
    openGraph: { title: dealer.companyName, type: 'website' },
  };
}

export default async function DealerPage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const dealer = await getDealerBySlug(slug);
  if (!dealer) notFound();

  const t = await getTranslations('dealerProfile');
  const td = await getTranslations('dealers');

  const [vehicles, currency, eurToAll, viewer, compareIds] = await Promise.all([
    prisma.vehicle.findMany({
      where: { dealerId: dealer.id, status: 'ACTIVE' },
      select: CARD_SELECT,
      orderBy: [{ rankScore: 'desc' }, { publishedAt: 'desc' }],
      take: 12,
    }),
    getCurrency(),
    getEurToAllRate(),
    getSessionUser(),
    getCompareIds(),
  ]);

  const favorites = await getFavoriteIds(vehicles.map((vehicle) => vehicle.id));
  const compare = new Set(compareIds);

  return (
    <div className="lv-container py-8 sm:py-12">
      <Link
        href="/dealers"
        className="text-muted-foreground hover:text-foreground text-sm transition-colors"
      >
        ← {t('allDealers')}
      </Link>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {dealer.companyName}
            </h1>
            {dealer.verification === 'VERIFIED' ? (
              <BadgeCheck className="text-primary size-6 shrink-0" aria-hidden />
            ) : null}
          </div>

          <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            {dealer.city ? (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-4" aria-hidden />
                {[dealer.addressLine, dealer.postalCode, dealer.city.name]
                  .filter(Boolean)
                  .join(', ')}
              </span>
            ) : null}
            {dealer.verifiedAt ? (
              <span>
                {t('verifiedSince', { date: formatDate(dealer.verifiedAt, locale as Locale) })}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div>
            <p className="text-2xl font-semibold">{dealer._count.vehicles}</p>
            <p className="text-muted-foreground text-xs">{t('vehiclesLabel')}</p>
          </div>
          {dealer.ratingCount > 0 ? (
            <div>
              <p className="inline-flex items-center gap-1.5 text-2xl font-semibold">
                <Star className="text-featured size-5 fill-current" aria-hidden />
                {dealer.ratingAvg.toFixed(1)}
              </p>
              <p className="text-muted-foreground text-xs">
                {td('reviews', { count: dealer.ratingCount })}
              </p>
            </div>
          ) : null}
        </div>
      </header>

      <div className="mt-8 lg:grid lg:grid-cols-[1fr_20rem] lg:items-start lg:gap-8">
        <div className="min-w-0">
          {dealer.description ? (
            <section>
              <h2 className="text-lg font-semibold">{t('about')}</h2>
              <p className="text-muted-foreground mt-3 leading-relaxed">{dealer.description}</p>
            </section>
          ) : null}

          <section className="mt-10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">{t('inventory')}</h2>
              {dealer._count.vehicles > vehicles.length ? (
                <Link
                  href={{ pathname: '/search', query: { dealer: dealer.slug } }}
                  className="text-primary inline-flex items-center gap-1 text-sm font-medium hover:underline"
                >
                  {t('showAllVehicles')}
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              ) : null}
            </div>

            {vehicles.length === 0 ? (
              <div className="bg-surface mt-4 rounded-xl border px-6 py-14 text-center">
                <p className="font-semibold">{t('noVehicles')}</p>
                <p className="text-muted-foreground mt-2 text-sm">{t('noVehiclesHint')}</p>
              </div>
            ) : (
              <ul className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {vehicles.map((vehicle, index) => (
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
            )}
          </section>

          <DealerReviews
            dealerId={dealer.id}
            reviews={dealer.reviews}
            locale={locale as Locale}
            canReview={Boolean(viewer) && viewer?.id !== dealer.userId}
            alreadyReviewed={dealer.reviews.some((review) => review.authorId === viewer?.id)}
          />
        </div>

        <DealerContact
          phone={dealer.phone}
          email={dealer.publicEmail}
          website={dealer.website}
          openingHours={dealer.openingHours}
        />
      </div>
    </div>
  );
}
