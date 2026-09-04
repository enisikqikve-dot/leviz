import type { Metadata } from 'next';
import { Receipt } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

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

  const [payments, collected, pending, currency, eurToAll] = await Promise.all([
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
    prisma.payment.count({ where: { status: 'PENDING' } }),
    getCurrency(),
    getEurToAllRate(),
  ]);

  const price = (cents: number) =>
    formatPrice(cents, { currency, locale: locale as Locale, eurToAll, withCents: true });

  return (
    <div>
      <h2 className="text-lg font-semibold">{t('title')}</h2>
      <p className="text-muted-foreground mt-1 text-sm">{t('subtitle')}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="bg-card text-card-foreground rounded-xl border p-4">
          <p className="text-muted-foreground text-sm">{t('total')}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">
            {price(collected._sum.amountCents ?? 0)}
          </p>
        </div>
        <div className="bg-card text-card-foreground rounded-xl border p-4">
          <p className="text-muted-foreground text-sm">{t('pending')}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">{pending}</p>
        </div>
      </div>

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
