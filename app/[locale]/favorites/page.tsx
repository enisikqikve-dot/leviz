import type { Metadata } from 'next';
import { Heart } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Button } from '@/components/ui/button';
import { getEurToAllRate } from '@/features/search/data';
import { CARD_SELECT } from '@/features/search/queries';
import { VehicleCard } from '@/features/vehicles/components/vehicle-card';
import { requireUser } from '@/lib/auth/guards';
import { getCurrency } from '@/lib/currency-server';
import { prisma } from '@/lib/db';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'favorites' });
  return { title: t('title'), robots: { index: false } };
}

export default async function FavoritesPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await requireUser();
  const t = await getTranslations('favorites');

  const [favorites, currency, eurToAll] = await Promise.all([
    prisma.favorite.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: { vehicle: { select: CARD_SELECT } },
    }),
    getCurrency(),
    getEurToAllRate(),
  ]);

  const vehicles = favorites.map((entry) => entry.vehicle);

  return (
    <div className="lv-container py-8 sm:py-12">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('title')}</h1>
        {vehicles.length > 0 ? (
          <p className="text-muted-foreground text-sm">
            {t('count', { count: vehicles.length })}
          </p>
        ) : null}
      </header>

      {vehicles.length === 0 ? (
        <div className="bg-surface mt-8 flex flex-col items-center rounded-xl border px-6 py-20 text-center">
          <span className="bg-muted text-muted-foreground inline-flex size-14 items-center justify-center rounded-full">
            <Heart className="size-7" aria-hidden />
          </span>
          <h2 className="mt-6 text-lg font-semibold">{t('empty')}</h2>
          <p className="text-muted-foreground mt-2 max-w-sm text-sm">{t('emptyHint')}</p>
          <Button asChild size="lg" className="mt-6">
            <Link href="/search">{t('browse')}</Link>
          </Button>
        </div>
      ) : (
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {vehicles.map((vehicle, index) => (
            <li key={vehicle.id}>
              <VehicleCard
                vehicle={vehicle}
                locale={locale as Locale}
                currency={currency}
                eurToAll={eurToAll}
                // Auf dieser Seite ist naturgemäß alles gemerkt.
                favorited
                priority={index < 4}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
