import type { Metadata } from 'next';
import { Receipt } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Button } from '@/components/ui/button';
import { SubscriptionActions } from '@/features/packages/components/subscription-actions';
import { isFeaturePayment, paymentSubject } from '@/features/packages/label';
import {
  getActiveSubscription,
  listPayments,
} from '@/features/packages/queries';
import { getEurToAllRate } from '@/features/search/data';
import { requireUser } from '@/lib/auth/guards';
import { formatPrice } from '@/lib/currency';
import { getCurrency } from '@/lib/currency-server';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import { cn } from '@/lib/utils';

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'billing' });
  return { title: t('title'), description: t('metaDescription'), robots: { index: false } };
}

/** Farbton je Zahlungsstatus. */
const STATUS_TONE: Record<string, string> = {
  SUCCEEDED: 'bg-success/10 text-success',
  PENDING: 'bg-warning/15 text-warning-foreground dark:text-warning',
  FAILED: 'bg-destructive/10 text-destructive',
  REFUNDED: 'bg-muted text-muted-foreground',
};

export default async function BillingPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await requireUser();
  const t = await getTranslations('billing');
  const tf = await getTranslations('feature');

  const [subscription, payments, currency, eurToAll] = await Promise.all([
    getActiveSubscription(user.id),
    listPayments(user.id),
    getCurrency(),
    getEurToAllRate(),
  ]);

  const price = (cents: number) =>
    formatPrice(cents, { currency, locale: locale as Locale, eurToAll, withCents: true });

  // Ohne Zeitzonenabhängigkeit: das ISO-Datum ist in jeder Sprache eindeutig.
  const day = (value: Date) => value.toISOString().slice(0, 10);

  const packageName =
    subscription &&
    (locale === 'de'
      ? subscription.package.nameDe
      : locale === 'en'
        ? subscription.package.nameEn
        : subscription.package.nameSq);

  return (
    <div className="lv-container py-8 sm:py-12">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('title')}</h1>

      <section className="bg-card text-card-foreground mt-6 rounded-xl border p-5">
        <h2 className="text-muted-foreground text-sm font-medium">{t('currentPackage')}</h2>

        {subscription ? (
          <>
            <p className="mt-1 text-lg font-semibold">{packageName}</p>
            <p className="text-muted-foreground mt-1 text-sm">
              {subscription.cancelAtPeriodEnd
                ? t('endsOn', { date: day(subscription.currentPeriodEnd) })
                : t('renewsOn', { date: day(subscription.currentPeriodEnd) })}
            </p>

            <SubscriptionActions
              cancelAtPeriodEnd={subscription.cancelAtPeriodEnd}
              cancelLabel={t('cancel')}
              resumeLabel={t('resume')}
            />
          </>
        ) : (
          <>
            <p className="mt-1 text-sm">{t('noPackage')}</p>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/pricing">{t('seePackages')}</Link>
            </Button>
          </>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">{t('history')}</h2>

        {payments.length === 0 ? (
          <div className="bg-surface mt-4 flex flex-col items-center rounded-xl border px-6 py-14 text-center">
            <span className="bg-muted text-muted-foreground inline-flex size-12 items-center justify-center rounded-full">
              <Receipt className="size-6" aria-hidden />
            </span>
            <p className="text-muted-foreground mt-4 text-sm">{t('empty')}</p>
          </div>
        ) : (
          <ul className="mt-4 space-y-2">
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
                    {day(payment.paidAt ?? payment.createdAt)}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-xs font-medium',
                      STATUS_TONE[payment.status] ?? 'bg-muted text-muted-foreground',
                    )}
                  >
                    {t(`status${payment.status}` as 'statusPENDING')}
                  </span>
                  <span className="text-sm font-semibold">{price(payment.amountCents)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
