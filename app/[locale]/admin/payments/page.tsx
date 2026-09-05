import type { Metadata } from 'next';
import { Minus, Receipt, TrendingDown, TrendingUp } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { RevenueChart } from '@/features/admin/components/revenue-chart';
import { buildRevenueReport, type RevenueRow } from '@/features/admin/revenue';
import { loadRevenueRows } from '@/features/admin/revenue-queries';
import { isFeaturePayment, paymentSubject } from '@/features/packages/label';
import { getEurToAllRate } from '@/features/search/data';
import { formatPrice } from '@/lib/currency';
import { getCurrency } from '@/lib/currency-server';
import { prisma } from '@/lib/db';
import type { Locale } from '@/lib/i18n/routing';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { robots: { index: false } };

type PageProps = { params: Promise<{ locale: string }> };

/** Farbton je Zahlungsstatus. */
const STATUS_TONE: Record<string, string> = {
  SUCCEEDED: 'bg-success/10 text-success',
  PENDING: 'bg-warning/15 text-warning-foreground dark:text-warning',
  FAILED: 'bg-destructive/10 text-destructive',
  REFUNDED: 'bg-muted text-muted-foreground',
};

export default async function AdminPaymentsPage({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations('admin.payments');
  const tb = await getTranslations('billing');
  const tf = await getTranslations('feature');

  const now = new Date();

  const [payments, collected, revenueRows, currency, eurToAll] = await Promise.all([
    prisma.payment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        amountCents: true,
        status: true,
        provider: true,
        paidAt: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
        vehicle: { select: { title: true } },
        package: { select: { nameSq: true, nameDe: true, nameEn: true } },
      },
    }),
    prisma.payment.aggregate({
      where: { status: 'SUCCEEDED' },
      _sum: { amountCents: true },
    }),
    loadRevenueRows(now),
    getCurrency(),
    getEurToAllRate(),
  ]);

  const price = (cents: number) =>
    formatPrice(cents, { currency, locale: locale as Locale, eurToAll, withCents: true });

  // Die Bezeichnung entsteht hier, nicht in der Auswertung: sie hängt an der
  // Sprache des Betrachters, die Rechnung nicht.
  const rows: RevenueRow[] = revenueRows.map((row) => ({
    amountCents: row.amountCents,
    status: row.status,
    at: row.paidAt ?? row.createdAt,
    subject: isFeaturePayment(row)
      ? tf('title')
      : (paymentSubject(row, locale as Locale) ?? t('unknownSubject')),
  }));

  const report = buildRevenueReport(rows, now);

  const Trend = report.deltaCents > 0 ? TrendingUp : report.deltaCents < 0 ? TrendingDown : Minus;
  const trendTone =
    report.deltaCents > 0
      ? 'text-success'
      : report.deltaCents < 0
        ? 'text-destructive'
        : 'text-muted-foreground';

  return (
    <div>
      <h2 className="text-lg font-semibold">{t('title')}</h2>
      <p className="text-muted-foreground mt-1 text-sm">{t('subtitle')}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-card text-card-foreground rounded-xl border p-4 sm:col-span-2">
          <p className="text-muted-foreground text-sm">{t('thisMonth')}</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight">
            {price(report.current.cents)}
          </p>

          <p className={cn('mt-2 flex items-center gap-1.5 text-sm', trendTone)}>
            <Trend className="size-4 shrink-0" aria-hidden />
            <span>
              {report.deltaCents >= 0 ? '+' : '−'}
              {price(Math.abs(report.deltaCents))}
              {report.deltaPercent === null
                ? null
                : ` (${report.deltaPercent >= 0 ? '+' : '−'}${Math.abs(report.deltaPercent).toFixed(0)} %)`}
            </span>
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            {report.deltaPercent === null && report.previous.cents === 0
              ? t('noComparison')
              : t('versusLastMonth', { amount: price(report.previous.cents) })}
          </p>
        </div>

        <div className="bg-card text-card-foreground rounded-xl border p-4">
          <p className="text-muted-foreground text-sm">{t('payments')}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">{report.current.count}</p>
          <p className="text-muted-foreground mt-1 text-xs">
            {report.averageCents === null
              ? t('noPaymentsThisMonth')
              : t('average', { amount: price(report.averageCents) })}
          </p>
        </div>

        <div className="bg-card text-card-foreground rounded-xl border p-4">
          <p className="text-muted-foreground text-sm">{t('pending')}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">{report.pendingCount}</p>
          <p className="text-muted-foreground mt-1 text-xs">
            {price(report.pendingCents)}
          </p>
        </div>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RevenueChart
            months={report.months}
            locale={locale as Locale}
            label={t('trend')}
            format={price}
          />
        </div>

        <div className="bg-card text-card-foreground rounded-xl border p-5">
          <h3 className="text-sm font-semibold">{t('whatFor')}</h3>

          {report.bySubject.length === 0 ? (
            <p className="text-muted-foreground mt-4 text-sm">{t('noPaymentsThisMonth')}</p>
          ) : (
            <ul className="mt-4 space-y-2.5">
              {report.bySubject.map((entry) => (
                <li key={entry.subject} className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate text-sm">
                    {entry.subject}
                    <span className="text-muted-foreground ml-1.5 text-xs">×{entry.count}</span>
                  </span>
                  <span className="shrink-0 text-sm font-medium">{price(entry.cents)}</span>
                </li>
              ))}
            </ul>
          )}

          <dl className="mt-5 space-y-1.5 border-t pt-4 text-xs">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{t('total')}</dt>
              <dd className="font-medium">{price(collected._sum.amountCents ?? 0)}</dd>
            </div>
            {report.refundedCents > 0 ? (
              <div className="flex justify-between gap-3">
                {/* Erstattungen werden getrennt gezeigt, nicht verrechnet: sie
                    fallen oft in einen anderen Monat als die Zahlung. */}
                <dt className="text-muted-foreground">{t('refunded')}</dt>
                <dd className="text-destructive font-medium">
                  −{price(report.refundedCents)}
                </dd>
              </div>
            ) : null}
          </dl>
        </div>
      </div>

      <h3 className="mt-8 text-sm font-semibold">{t('latest')}</h3>

      {payments.length === 0 ? (
        <div className="bg-surface mt-6 flex flex-col items-center rounded-xl border px-6 py-14 text-center">
          <span className="bg-muted text-muted-foreground inline-flex size-12 items-center justify-center rounded-full">
            <Receipt className="size-6" aria-hidden />
          </span>
          <p className="text-muted-foreground mt-4 text-sm">{t('empty')}</p>
        </div>
      ) : (
        <ul className="mt-6 space-y-2">
          {payments.map((payment) => (
            <li
              key={payment.id}
              className="bg-card text-card-foreground flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {isFeaturePayment(payment) ? `${tf('title')} · ` : ''}
                  {paymentSubject(payment, locale as Locale)}
                </p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {payment.user.name ?? payment.user.email} ·{' '}
                  {(payment.paidAt ?? payment.createdAt).toISOString().slice(0, 10)} ·{' '}
                  {payment.provider}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-medium',
                    STATUS_TONE[payment.status] ?? 'bg-muted text-muted-foreground',
                  )}
                >
                  {tb(`status${payment.status}` as 'statusPENDING')}
                </span>
                <span className="text-sm font-semibold">{price(payment.amountCents)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
