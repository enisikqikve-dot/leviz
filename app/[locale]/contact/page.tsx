import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { EntityCard } from '@/features/legal/components/entity-card';
import { LegalDocument, legalMetadata } from '@/features/legal/render';
import type { Locale } from '@/lib/i18n/routing';

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  return legalMetadata('contact', locale);
}

export default async function Page({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'legal' });

  return (
    <LegalDocument kind="contact" locale={locale as Locale}>
      <EntityCard
        labels={{
          name: t('fields.name'),
          legalForm: t('fields.legalForm'),
          address: t('fields.address'),
          registrationNumber: t('fields.registrationNumber'),
          taxNumber: t('fields.taxNumber'),
          vatNumber: t('fields.vatNumber'),
          representative: t('fields.representative'),
          email: t('fields.email'),
          phone: t('fields.phone'),
        }}
        warning={t('operatorMissing')}
      />
    </LegalDocument>
  );
}
