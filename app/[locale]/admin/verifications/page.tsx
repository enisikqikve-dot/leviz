import type { Metadata } from 'next';
import { BadgeCheck, ExternalLink, ShieldAlert, ShieldCheck } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { ReviewActions } from '@/features/verification/components/review-actions';
import { purgeExpiredDocuments } from '@/features/verification/purge';
import {
  listDecidedVerifications,
  listPendingVerifications,
  type AdminVerification,
} from '@/features/verification/queries';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { robots: { index: false } };

export default async function AdminVerificationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('admin.verifications');

  // Abgelaufene Belege verschwinden hier mit, nicht nur über die Zeitsteuerung
  // auf dem Server. Sollte die einmal nicht laufen, sammeln sich sonst
  // Ausweiskopien an, von denen niemand etwas ahnt.
  await purgeExpiredDocuments();

  const [offen, entschieden] = await Promise.all([
    listPendingVerifications(),
    listDecidedVerifications(),
  ]);

  const datum = (value: Date | null) =>
    value
      ? new Intl.DateTimeFormat(locale === 'sq' ? 'sq-AL' : (locale as Locale), {
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(value)
      : '—';

  return (
    <div>
      <h2 className="text-lg font-semibold">{t('title')}</h2>
      <p className="text-muted-foreground mt-1 text-sm">{t('subtitle')}</p>

      {offen.length === 0 ? (
        <p className="bg-card text-muted-foreground mt-6 rounded-xl border p-6 text-sm">
          {t('empty')}
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {offen.map((antrag) => (
            <li key={antrag.id} className="bg-card rounded-xl border p-4">
              <RequestBody antrag={antrag} datum={datum} t={t} />
              <ReviewActions requestId={antrag.id} />
            </li>
          ))}
        </ul>
      )}

      {entschieden.length > 0 ? (
        <>
          <h3 className="mt-10 text-sm font-semibold">{t('decided')}</h3>
          <ul className="mt-3 space-y-2">
            {entschieden.map((antrag) => (
              <li
                key={antrag.id}
                className="bg-card flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 text-sm"
              >
                <span className="min-w-0 flex-1 truncate font-medium">
                  {antrag.legalName}
                  {antrag.companyName ? (
                    <span className="text-muted-foreground"> · {antrag.companyName}</span>
                  ) : null}
                </span>

                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium',
                    antrag.status === 'VERIFIED'
                      ? 'bg-success/10 text-success'
                      : 'bg-destructive/10 text-destructive',
                  )}
                >
                  {antrag.status === 'VERIFIED' ? (
                    <ShieldCheck className="size-3.5" aria-hidden />
                  ) : (
                    <ShieldAlert className="size-3.5" aria-hidden />
                  )}
                  {t(`status.${antrag.status}`)}
                </span>

                <span className="text-muted-foreground text-xs">{datum(antrag.reviewedAt)}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}

function RequestBody({
  antrag,
  datum,
  t,
}: {
  antrag: AdminVerification;
  datum: (value: Date | null) => string;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  const angaben: [string, string][] = [
    [t('legalName'), antrag.legalName],
    [t('account'), antrag.user.name ?? antrag.user.email ?? '—'],
    [t('contact'), antrag.user.email ?? antrag.user.phone ?? '—'],
    [
      t('address'),
      [antrag.addressLine, antrag.postalCode, antrag.city].filter(Boolean).join(', '),
    ],
    ...(antrag.companyName ? ([[t('company'), antrag.companyName]] as [string, string][]) : []),
    ...(antrag.registrationNumber
      ? ([[t('registrationNumber'), antrag.registrationNumber]] as [string, string][])
      : []),
    [t('submitted'), datum(antrag.createdAt)],
  ];

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <BadgeCheck className="text-muted-foreground size-4" aria-hidden />
        <span className="font-semibold">{antrag.legalName}</span>
        <span className="bg-muted rounded-md px-2 py-0.5 text-xs font-medium">
          {t(`kinds.${antrag.kind}`)}
        </span>
        <Link
          href={{ pathname: '/admin/users/[id]', params: { id: antrag.user.id } }}
          className="text-primary ms-auto text-xs hover:underline"
        >
          {t('openProfile')}
        </Link>
      </div>

      <dl className="mt-3 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
        {angaben.map(([label, value]) => (
          <div key={label} className="flex gap-2">
            <dt className="text-muted-foreground shrink-0">{label}</dt>
            <dd className="min-w-0 truncate font-medium">{value}</dd>
          </div>
        ))}
      </dl>

      {/* Die Belege öffnen sich in einem neuen Tab über eine Route, die den
          Verwalter erneut prüft — eingebettet anzuzeigen hiesse, Ausweise
          beim Blättern durch die Liste dauernd sichtbar zu haben. */}
      <div className="mt-3 flex flex-wrap gap-2">
        {antrag.documents.map((beleg) => (
          <a
            key={beleg.id}
            href={`/api/verification/documents/${beleg.id}`}
            target="_blank"
            rel="noreferrer"
            className="bg-muted hover:bg-muted/70 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
          >
            <ExternalLink className="size-3.5" aria-hidden />
            {t(`documentTypes.${beleg.type}`)}
          </a>
        ))}
        {antrag.documents.length === 0 ? (
          <span className="text-muted-foreground text-xs">{t('documentsPurged')}</span>
        ) : null}
      </div>
    </>
  );
}
