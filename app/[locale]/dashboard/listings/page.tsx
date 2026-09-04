import type { Metadata } from 'next';
import { Car, Eye, Heart, MessageSquare, Plus } from 'lucide-react';
import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Button } from '@/components/ui/button';
import { ListingActions } from '@/features/listings/components/listing-actions';
import { FeatureListing } from '@/features/packages/components/feature-listing';
import { getEurToAllRate } from '@/features/search/data';
import { variantFromTitle } from '@/features/vehicles/format';
import { requireUser } from '@/lib/auth/guards';
import { formatPrice } from '@/lib/currency';
import { getCurrency } from '@/lib/currency-server';
import { prisma } from '@/lib/db';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import { cn } from '@/lib/utils';

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'myListings' });
  return { title: t('title'), robots: { index: false } };
}

/** Farbton je Status, damit sich der Zustand auf einen Blick erfassen lässt. */
const STATUS_TONE: Record<string, string> = {
  ACTIVE: 'bg-success/10 text-success',
  PENDING_REVIEW: 'bg-warning/15 text-warning-foreground dark:text-warning',
  PAUSED: 'bg-muted text-muted-foreground',
  DRAFT: 'bg-muted text-muted-foreground',
  SOLD: 'bg-primary/10 text-primary',
  REJECTED: 'bg-destructive/10 text-destructive',
  EXPIRED: 'bg-destructive/10 text-destructive',
};

export default async function MyListingsPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await requireUser();
  const t = await getTranslations('myListings');

  const [vehicles, featurePackages, currency, eurToAll] = await Promise.all([
    prisma.vehicle.findMany({
      // Eigene Inserate und, für Händler, die des Autohauses.
      where: user.dealerId
        ? { OR: [{ sellerId: user.id }, { dealerId: user.dealerId }] }
        : { sellerId: user.id },
      select: {
        id: true, slug: true, title: true, status: true, priceCents: true,
        viewCount: true, inquiryCount: true, favoriteCount: true, qualityScore: true,
        featuredUntil: true,
        brand: { select: { name: true } },
        model: { select: { name: true } },
        images: { select: { url: true }, orderBy: { position: 'asc' }, take: 1 },
      },
      orderBy: [{ updatedAt: 'desc' }],
    }),
    // Nur Pakete, die tatsächlich eine Laufzeit als Hervorhebung gewähren.
    prisma.package.findMany({
      where: { active: true, featuredDays: { gt: 0 }, isDealerPackage: false },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, featuredDays: true, priceCents: true },
    }),
    getCurrency(),
    getEurToAllRate(),
  ]);

  const featureOptions = featurePackages.map((pkg) => ({
    packageId: pkg.id,
    days: pkg.featuredDays,
    price: formatPrice(pkg.priceCents, { currency, locale: locale as Locale, eurToAll, withCents: true }),
  }));

  return (
    <div className="lv-container py-8 sm:py-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('title')}</h1>
        <Button asChild>
          <Link href="/sell/create">
            <Plus className="size-4" aria-hidden />
            {t('create')}
          </Link>
        </Button>
      </header>

      {vehicles.length === 0 ? (
        <div className="bg-surface mt-8 flex flex-col items-center rounded-xl border px-6 py-20 text-center">
          <span className="bg-muted text-muted-foreground inline-flex size-14 items-center justify-center rounded-full">
            <Car className="size-7" aria-hidden />
          </span>
          <h2 className="mt-6 text-lg font-semibold">{t('empty')}</h2>
          <p className="text-muted-foreground mt-2 max-w-sm text-sm">{t('emptyHint')}</p>
          <Button asChild size="lg" className="mt-6">
            <Link href="/sell/create">{t('create')}</Link>
          </Button>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {vehicles.map((vehicle) => {
            const variant = variantFromTitle(vehicle.title, vehicle.brand.name, vehicle.model.name);

            return (
              <li
                key={vehicle.id}
                className="bg-card shadow-card flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center"
              >
                <div className="bg-muted relative h-24 w-full shrink-0 overflow-hidden rounded-lg sm:h-20 sm:w-28">
                  {vehicle.images[0] ? (
                    <Image
                      src={vehicle.images[0].url}
                      alt=""
                      fill
                      sizes="112px"
                      className="object-cover"
                    />
                  ) : null}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={{ pathname: '/vehicle/[slug]', params: { slug: vehicle.slug } }}
                      className="truncate font-semibold hover:underline"
                    >
                      {vehicle.brand.name} {vehicle.model.name}
                    </Link>
                    <span
                      className={cn(
                        'rounded-md px-2 py-0.5 text-xs font-medium',
                        STATUS_TONE[vehicle.status] ?? 'bg-muted',
                      )}
                    >
                      {t(`status.${vehicle.status}`)}
                    </span>
                  </div>

                  {variant ? (
                    <p className="text-muted-foreground truncate text-sm">{variant}</p>
                  ) : null}

                  <ul className="text-muted-foreground mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    <li className="inline-flex items-center gap-1">
                      <Eye className="size-3.5" aria-hidden />
                      {vehicle.viewCount} {t('views')}
                    </li>
                    <li className="inline-flex items-center gap-1">
                      <MessageSquare className="size-3.5" aria-hidden />
                      {vehicle.inquiryCount} {t('inquiries')}
                    </li>
                    <li className="inline-flex items-center gap-1">
                      <Heart className="size-3.5" aria-hidden />
                      {vehicle.favoriteCount} {t('favorites')}
                    </li>
                    <li>{t('quality')} {vehicle.qualityScore}%</li>
                  </ul>

                  {vehicle.status === 'ACTIVE' ? (
                    <FeatureListing
                      vehicleId={vehicle.id}
                      featuredUntil={
                        vehicle.featuredUntil && vehicle.featuredUntil > new Date()
                          ? vehicle.featuredUntil.toISOString().slice(0, 10)
                          : null
                      }
                      options={featureOptions}
                    />
                  ) : null}
                </div>

                <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                  <p className="text-lg font-semibold whitespace-nowrap">
                    {formatPrice(vehicle.priceCents, {
                      currency, locale: locale as Locale, eurToAll,
                    })}
                  </p>
                  <ListingActions vehicleId={vehicle.id} status={vehicle.status} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
