import type { Metadata } from 'next';
import { Info } from 'lucide-react';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Button } from '@/components/ui/button';
import { CheckoutForm } from '@/features/packages/components/checkout-form';
import { getEurToAllRate } from '@/features/search/data';
import { requireUser } from '@/lib/auth/guards';
import { formatPrice } from '@/lib/currency';
import { getCurrency } from '@/lib/currency-server';
import { prisma } from '@/lib/db';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';

type PageProps = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'checkout' });
  return { title: t('title'), description: t('metaDescription'), robots: { index: false } };
}

/**
 * Bezahlseite des Mock-Anbieters.
 *
 * Sie bestaetigt nur; gewaehrt wird ausschliesslich ueber den signierten
 * Rueckruf in `/api/webhooks/payments`. Wer die Adresse erraet, sieht darum
 * nichts Fremdes und erhaelt nichts: die Zahlung muss ihm gehoeren.
 */
export default async function CheckoutPage({ params }: PageProps) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const user = await requireUser();
  const t = await getTranslations('checkout');

  const payment = await prisma.payment.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      amountCents: true,
      status: true,
      description: true,
      provider: true,
    },
  });

  if (!payment || payment.userId !== user.id) notFound();

  const [currency, eurToAll] = await Promise.all([getCurrency(), getEurToAllRate()]);
  const amount = formatPrice(payment.amountCents, {
    currency,
    locale: locale as Locale,
    eurToAll,
  });

  const settled = payment.status !== 'PENDING';

  return (
    <div className="lv-container flex justify-center py-10 sm:py-16">
      <div className="bg-card text-card-foreground w-full max-w-md rounded-xl border p-6">
        <h1 className="text-xl font-semibold tracking-tight">{t('title')}</h1>

        <dl className="mt-5 space-y-3 text-sm">
          <div className="flex items-start justify-between gap-4">
            <dt className="text-muted-foreground">{t('summary')}</dt>
            <dd className="text-end font-medium">{payment.description}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 border-t pt-3">
            <dt className="text-muted-foreground">{t('amount')}</dt>
            <dd className="text-lg font-semibold">{amount}</dd>
          </div>
        </dl>

        {settled ? (
          <div className="mt-6 space-y-4">
            <p className="text-muted-foreground text-sm">{t('settled')}</p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard/billing">{t('backToPricing')}</Link>
            </Button>
          </div>
        ) : (
          <>
            <p className="bg-muted text-muted-foreground mt-6 flex items-start gap-2 rounded-lg p-3 text-xs">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>{t('testNotice')}</span>
            </p>

            <CheckoutForm
              paymentId={payment.id}
              payLabel={t('pay')}
              cancelLabel={t('cancel')}
            />
          </>
        )}
      </div>
    </div>
  );
}
