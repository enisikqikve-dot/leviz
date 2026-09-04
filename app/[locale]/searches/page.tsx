import type { Metadata } from 'next';
import { Bookmark } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Button } from '@/components/ui/button';
import { SavedSearchRow } from '@/features/searches/components/saved-search-row';
import { getSavedSearches } from '@/features/searches/queries';
import { requireUser } from '@/lib/auth/guards';
import { Link } from '@/lib/i18n/navigation';

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'searches' });
  return { title: t('title'), robots: { index: false } };
}

export default async function SavedSearchesPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await requireUser();
  const t = await getTranslations('searches');
  const searches = await getSavedSearches(user.id);

  return (
    <div className="lv-container py-8 sm:py-12">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('title')}</h1>

      {searches.length === 0 ? (
        <div className="bg-surface mt-8 flex flex-col items-center rounded-xl border px-6 py-20 text-center">
          <span className="bg-muted text-muted-foreground inline-flex size-14 items-center justify-center rounded-full">
            <Bookmark className="size-7" aria-hidden />
          </span>
          <h2 className="mt-6 text-lg font-semibold">{t('empty')}</h2>
          <p className="text-muted-foreground mt-2 max-w-sm text-sm">{t('emptyHint')}</p>
          <Button asChild size="lg" className="mt-6">
            <Link href="/search">{t('open')}</Link>
          </Button>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {searches.map((search) => (
            <SavedSearchRow
              key={search.id}
              id={search.id}
              name={search.name}
              query={search.query}
              filterCount={search.filterCount}
              matchCount={search.matchCount}
              newCount={search.newCount}
              notifyByEmail={search.notifyByEmail}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
