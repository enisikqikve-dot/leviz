import type { Metadata } from 'next';
import { Building2 } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Button } from '@/components/ui/button';
import { ImportForm } from '@/features/import/components/import-form';
import { requireUser } from '@/lib/auth/guards';
import { Link } from '@/lib/i18n/navigation';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'import' });
  return { title: t('metaTitle'), robots: { index: false } };
}

export default async function ImportPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Bewusst `requireUser` und nicht `requireDealer`: wer kein Händlerkonto hat,
  // soll lesen können, wofür die Seite da ist, statt vor einer Fehlerseite zu
  // stehen. Die Aktionen dahinter prüfen selbst und lassen niemanden durch.
  const user = await requireUser();
  const t = await getTranslations('import');

  return (
    <div className="lv-container max-w-4xl py-12">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('title')}</h1>
      <p className="text-muted-foreground mt-2">{t('subtitle')}</p>

      <div className="mt-8">
        {user.dealerId ? (
          <ImportForm />
        ) : (
          <div className="bg-surface flex flex-col items-center rounded-xl border px-6 py-16 text-center">
            <span className="bg-muted text-muted-foreground inline-flex size-14 items-center justify-center rounded-full">
              <Building2 className="size-7" aria-hidden />
            </span>
            <p className="mt-6 max-w-sm text-sm">{t('onlyDealers')}</p>
            <Button asChild variant="outline" size="lg" className="mt-6">
              <Link href="/dashboard/settings">{t('back')}</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
