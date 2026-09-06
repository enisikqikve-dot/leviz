import type { Metadata } from 'next';
import { BadgeCheck, Clock, ShieldAlert } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { VerificationForm } from '@/features/verification/components/verification-form';
import { getLatestVerification } from '@/features/verification/queries';
import { requireUser } from '@/lib/auth/guards';
import type { Locale } from '@/lib/i18n/routing';

export const metadata: Metadata = { robots: { index: false } };

export default async function VerificationPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await requireUser();
  const t = await getTranslations('verification');

  const antrag = await getLatestVerification(user.id);

  // Wer ein Händlerkonto führt, weist zusätzlich die Firma nach. Alle anderen
  // legen nur ihren Ausweis vor — freiwillig, aber mit demselben Abzeichen.
  const kind = user.dealerId ? 'DEALER' : 'PERSON';

  const datum = (value: Date) =>
    new Intl.DateTimeFormat(locale === 'sq' ? 'sq-AL' : (locale as Locale), {
      dateStyle: 'long',
    }).format(value);

  return (
    <div className="lv-container max-w-3xl py-8 sm:py-12">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('title')}</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        {kind === 'DEALER' ? t('introDealer') : t('introPerson')}
      </p>

      {antrag?.status === 'VERIFIED' ? (
        <div className="bg-success/10 text-success mt-8 flex items-start gap-3 rounded-2xl border border-current/20 p-6">
          <BadgeCheck className="size-6 shrink-0" aria-hidden />
          <div className="text-foreground">
            <h2 className="text-success text-base font-semibold">{t('statusVerified')}</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {antrag.reviewedAt ? t('verifiedOn', { date: datum(antrag.reviewedAt) }) : null}
            </p>
          </div>
        </div>
      ) : null}

      {antrag?.status === 'PENDING' ? (
        <div className="bg-card mt-8 flex items-start gap-3 rounded-2xl border p-6">
          <Clock className="text-muted-foreground size-6 shrink-0" aria-hidden />
          <div>
            <h2 className="text-base font-semibold">{t('statusPending')}</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {t('pendingBody', {
                date: datum(antrag.createdAt),
                count: antrag._count.documents,
              })}
            </p>
          </div>
        </div>
      ) : null}

      {antrag?.status === 'REJECTED' ? (
        <div className="border-destructive/30 bg-destructive/5 mt-8 flex items-start gap-3 rounded-2xl border p-6">
          <ShieldAlert className="text-destructive size-6 shrink-0" aria-hidden />
          <div>
            <h2 className="text-destructive text-base font-semibold">{t('statusRejected')}</h2>
            {/* Der Grund steht hier, sonst reicht der Antragsteller dasselbe
                noch einmal ein. */}
            {antrag.note ? <p className="mt-1 text-sm">{antrag.note}</p> : null}
            <p className="text-muted-foreground mt-2 text-sm">{t('rejectedHint')}</p>
          </div>
        </div>
      ) : null}

      {antrag?.status === 'VERIFIED' || antrag?.status === 'PENDING' ? null : (
        <div className="mt-8">
          <VerificationForm kind={kind} />
        </div>
      )}
    </div>
  );
}
