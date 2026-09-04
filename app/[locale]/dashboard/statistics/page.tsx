import type { Metadata } from 'next';
import { Car, Eye, Heart, MessageSquare, Tag, TrendingUp } from 'lucide-react';
import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { StatCard } from '@/features/dealers/components/stat-card';
import { ViewsChart } from '@/features/dealers/components/views-chart';
import {
  getSellerStats, getTopVehicles, getViewsOverTime,
} from '@/features/dealers/dashboard-queries';
import { getEurToAllRate } from '@/features/search/data';
import { requireUser } from '@/lib/auth/guards';
import { formatNumber, formatPrice } from '@/lib/currency';
import { getCurrency } from '@/lib/currency-server';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'dealerDashboard' });
  return { title: t('title'), robots: { index: false } };
}

export default async function StatisticsPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await requireUser();
  const t = await getTranslations('dealerDashboard');
  const tm = await getTranslations('myListings');

  // Händler sehen den Bestand ihres Autohauses, Privatverkäufer den eigenen.
  const scope = user.dealerId ? { dealerId: user.dealerId } : { sellerId: user.id };

  const [stats, points, top, currency, eurToAll] = await Promise.all([
    getSellerStats(scope),
    getViewsOverTime(scope, 30),
    getTopVehicles(scope, 5),
    getCurrency(),
    getEurToAllRate(),
  ]);

  const number = (value: number) => formatNumber(value, locale as Locale);

  return (
    <div className="lv-container py-8 sm:py-12">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('title')}</h1>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label={t('activeListings')} value={number(stats.activeListings)} icon={Car} />
        <StatCard label={t('soldVehicles')} value={number(stats.soldVehicles)} icon={Tag} />
        <StatCard label={t('totalViews')} value={number(stats.totalViews)} icon={Eye} />
        <StatCard label={t('totalInquiries')} value={number(stats.totalInquiries)} icon={MessageSquare} />
        <StatCard label={t('totalFavorites')} value={number(stats.totalFavorites)} icon={Heart} />
        <StatCard
          label={t('conversion')}
          value={`${stats.conversion}%`}
          hint={t('conversionHint')}
          icon={TrendingUp}
        />
      </div>

      <div className="mt-6">
        <ViewsChart
          points={points}
          locale={locale as Locale}
          label={`${t('viewsOverTime')} · ${t('last30Days')}`}
        />
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">{t('topVehicles')}</h2>

        {top.length === 0 ? (
          <p className="text-muted-foreground mt-4 text-sm">{t('noData')}</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {top.map((vehicle) => (
              <li key={vehicle.id}>
                <Link
                  href={{ pathname: '/vehicle/[slug]', params: { slug: vehicle.slug } }}
                  className="bg-card hover:shadow-card flex items-center gap-4 rounded-xl border p-4 transition-shadow"
                >
                  <div className="bg-muted relative size-16 shrink-0 overflow-hidden rounded-lg">
                    {vehicle.images[0] ? (
                      <Image src={vehicle.images[0].url} alt="" fill sizes="64px" className="object-cover" />
                    ) : null}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">
                      {vehicle.brand.name} {vehicle.model.name}
                    </p>
                    <ul className="text-muted-foreground mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                      <li className="inline-flex items-center gap-1">
                        <Eye className="size-3.5" aria-hidden />
                        {number(vehicle.viewCount)} {tm('views')}
                      </li>
                      <li className="inline-flex items-center gap-1">
                        <MessageSquare className="size-3.5" aria-hidden />
                        {number(vehicle.inquiryCount)} {tm('inquiries')}
                      </li>
                      <li className="inline-flex items-center gap-1">
                        <Heart className="size-3.5" aria-hidden />
                        {number(vehicle.favoriteCount)} {tm('favorites')}
                      </li>
                    </ul>
                  </div>

                  <p className="shrink-0 font-semibold whitespace-nowrap">
                    {formatPrice(vehicle.priceCents, { currency, locale: locale as Locale, eurToAll })}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
