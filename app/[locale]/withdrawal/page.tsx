import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';

import { LegalDocument, legalMetadata } from '@/features/legal/render';
import type { Locale } from '@/lib/i18n/routing';

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  return legalMetadata('withdrawal', locale);
}

export default async function Page({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <LegalDocument kind="withdrawal" locale={locale as Locale} />;
}
