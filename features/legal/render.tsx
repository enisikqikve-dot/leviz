import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';

import { LegalPage, type LegalSection } from '@/features/legal/components/legal-page';
import { LEGAL_UPDATED } from '@/lib/legal';
import type { Locale } from '@/lib/i18n/routing';

/** Die Rechtstexte, jeweils ein Namensraum unter `legal`. */
export type LegalKind =
  | 'terms'
  | 'withdrawal'
  | 'privacy'
  | 'cookies'
  | 'imprint'
  | 'contact';

/**
 * Diese Seiten gehören nicht in den Suchindex ausgeschlossen — im Gegenteil:
 * ein Zahlungsdienstleister und ein Besucher müssen sie finden. Sie werden
 * daher ganz normal indexiert.
 */
export async function legalMetadata(kind: LegalKind, locale: string): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'legal' });

  return {
    title: t(`${kind}.title`),
    description: t(`${kind}.intro`),
  };
}

export async function LegalDocument({
  kind,
  locale,
  children,
}: {
  kind: LegalKind;
  locale: Locale;
  children?: ReactNode;
}) {
  const t = await getTranslations({ locale, namespace: 'legal' });

  const formatted = new Intl.DateTimeFormat(locale === 'sq' ? 'sq-AL' : locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(LEGAL_UPDATED));

  return (
    <LegalPage
      title={t(`${kind}.title`)}
      intro={t(`${kind}.intro`)}
      updated={t('updated', { date: formatted })}
      sections={t.raw(`${kind}.sections`) as LegalSection[]}
    >
      {children}
    </LegalPage>
  );
}
