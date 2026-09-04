import type { Metadata } from 'next';
import { Store } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { DealerCard } from '@/features/dealers/components/dealer-card';
import { DealerFilters } from '@/features/dealers/components/dealer-filters';
import { listDealers, type DealerSort } from '@/features/dealers/queries';
import type { Locale } from '@/lib/i18n/routing';
import { alternatesFor } from '@/lib/seo/alternates';

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'dealers' });
  return {
    title: t('title'),
    description: t('metaDescription'),
    alternates: alternatesFor('/dealers', locale as Locale),
  };
}

const SORTS: DealerSort[] = ['rating', 'vehicles', 'name'];

export default async function DealersPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const raw = await searchParams;
  const query = typeof raw.q === 'string' ? raw.q : '';
  const verifiedOnly = raw.verified === '1';
  const sortParam = typeof raw.sort === 'string' ? raw.sort : 'rating';
  const sort = (SORTS.includes(sortParam as DealerSort) ? sortParam : 'rating') as DealerSort;

  const t = await getTranslations('dealers');
  const dealers = await listDealers({ query, verifiedOnly, sort });

  return (
    <div className="lv-container py-8 sm:py-12">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('title')}</h1>
        <p className="text-muted-foreground mt-2 text-sm">{t('subtitle')}</p>
      </header>

      <DealerFilters query={query} verifiedOnly={verifiedOnly} sort={sort} />

      {dealers.length === 0 ? (
        <div className="bg-surface mt-8 flex flex-col items-center rounded-xl border px-6 py-20 text-center">
          <span className="bg-muted text-muted-foreground inline-flex size-14 items-center justify-center rounded-full">
            <Store className="size-7" aria-hidden />
          </span>
          <h2 className="mt-6 text-lg font-semibold">{t('empty')}</h2>
          <p className="text-muted-foreground mt-2 max-w-sm text-sm">{t('emptyHint')}</p>
        </div>
      ) : (
        <>
          <p className="text-muted-foreground mt-6 text-sm" aria-live="polite">
            {t('count', { count: dealers.length })}
          </p>
          <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {dealers.map((dealer) => (
              <li key={dealer.id}>
                <DealerCard dealer={dealer} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
