import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { ListingWizard } from '@/features/listings/components/wizard';
import { loadWizardData } from '@/features/listings/data';
import { requireUser } from '@/lib/auth/guards';
import type { Locale } from '@/lib/i18n/routing';

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'listing' });
  return { title: t('title'), robots: { index: false } };
}

export default async function CreateListingPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Ohne Anmeldung geht es zur Anmeldeseite, nicht in eine Sackgasse.
  await requireUser();

  const t = await getTranslations('listing');
  const data = await loadWizardData(locale as Locale);

  return (
    <div className="lv-container py-8 sm:py-12">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('title')}</h1>
        <p className="text-muted-foreground mt-2 text-sm">{t('subtitle')}</p>
      </header>

      <ListingWizard data={data} />
    </div>
  );
}
