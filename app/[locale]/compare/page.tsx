import type { Metadata } from 'next';
import { GitCompare } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Button } from '@/components/ui/button';
import { getCompareIds } from '@/features/compare/server';
import { CompareTable } from '@/features/compare/components/compare-table';
import { getCompareVehicles } from '@/features/compare/queries';
import { getEurToAllRate } from '@/features/search/data';
import { getCurrency } from '@/lib/currency-server';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import { alternatesFor } from '@/lib/seo/alternates';

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'compare' });
  return {
    title: t('title'),
    robots: { index: false },
    alternates: alternatesFor('/compare', locale as Locale),
  };
}

export default async function ComparePage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('compare');

  const ids = await getCompareIds();
  const [vehicles, currency, eurToAll] = await Promise.all([
    getCompareVehicles(ids),
    getCurrency(),
    getEurToAllRate(),
  ]);

  return (
    <div className="lv-container py-8 sm:py-12">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('title')}</h1>

      {vehicles.length === 0 ? (
        <div className="bg-surface mt-8 flex flex-col items-center rounded-xl border px-6 py-20 text-center">
          <span className="bg-muted text-muted-foreground inline-flex size-14 items-center justify-center rounded-full">
            <GitCompare className="size-7" aria-hidden />
          </span>
          <h2 className="mt-6 text-lg font-semibold">{t('empty')}</h2>
          <p className="text-muted-foreground mt-2 max-w-sm text-sm">{t('emptyHint')}</p>
          <Button asChild size="lg" className="mt-6">
            <Link href="/search">{t('browse')}</Link>
          </Button>
        </div>
      ) : (
        <CompareTable
          vehicles={vehicles}
          locale={locale as Locale}
          currency={currency}
          eurToAll={eurToAll}
        />
      )}
    </div>
  );
}
