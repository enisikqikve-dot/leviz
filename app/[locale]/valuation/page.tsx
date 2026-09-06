import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { ValuationForm } from '@/features/pricing/components/valuation-form';
import { getEurToAllRate } from '@/features/search/data';
import { prisma } from '@/lib/db';
import { getCurrency } from '@/lib/currency-server';
import type { Locale } from '@/lib/i18n/routing';
import { alternatesFor } from '@/lib/seo/alternates';

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'valuation' });

  return {
    title: t('title'),
    description: t('intro'),
    alternates: alternatesFor('/valuation', locale as Locale),
  };
}

export default async function ValuationPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('valuation');

  const [brands, currency, eurToAll] = await Promise.all([
    prisma.brand.findMany({
      select: { slug: true, name: true },
      orderBy: [{ popular: 'desc' }, { name: 'asc' }],
    }),
    getCurrency(),
    getEurToAllRate(),
  ]);

  return (
    <div className="lv-container max-w-2xl py-8 sm:py-12">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('title')}</h1>
      <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{t('intro')}</p>

      <div className="mt-8">
        <ValuationForm
          brands={brands}
          locale={locale as Locale}
          currency={currency}
          eurToAll={eurToAll}
        />
      </div>
    </div>
  );
}
