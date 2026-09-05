import type { Metadata } from 'next';
import { ArrowLeft } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { loadSettings } from '@/features/account/data';
import { SettingsForms } from '@/features/account/components/settings-forms';
import { requireUser } from '@/lib/auth/guards';
import { Link } from '@/lib/i18n/navigation';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'account' });
  return { title: t('title'), robots: { index: false } };
}

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Serverseitiger Waechter vor jedem Datenzugriff.
  const user = await requireUser();
  const t = await getTranslations('account');
  const data = await loadSettings(user.id);

  return (
    <div className="lv-container max-w-2xl py-12">
      <Link
        href="/dashboard"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {t('backToDashboard')}
      </Link>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
        {t('title')}
      </h1>
      <p className="text-muted-foreground mt-2 text-sm">{t('subtitle')}</p>

      <div className="mt-8">
        <SettingsForms data={data} />
      </div>
    </div>
  );
}
