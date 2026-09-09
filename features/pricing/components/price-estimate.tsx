import { Info, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import type { EstimateResult } from '@/features/pricing/queries';
import { priceStanding } from '@/features/pricing/estimate';
import { formatPrice, type Currency } from '@/lib/currency';
import type { Locale } from '@/lib/i18n/routing';
import { cn } from '@/lib/utils';

/** Farbe und Zeichen je Einordnung. Unter dem Mittel ist für Käufer gut. */
const STANDING = {
  below: { icon: TrendingDown, tone: 'bg-success/10 text-success' },
  within: { icon: Minus, tone: 'bg-muted text-muted-foreground' },
  above: { icon: TrendingUp, tone: 'bg-warning/15 text-warning-foreground dark:text-warning' },
} as const;

/**
 * Einordnung des Preises.
 *
 * Die Spanne steht vor dem Mittelwert, und die Zahl der Vergleichsfahrzeuge
 * steht dabei: Wer sieht, dass die Schätzung auf sechs Angeboten beruht, kann
 * sie richtig gewichten. Der Hinweis, dass es eine Schätzung aus aktiven
 * Anzeigen ist, gehört sichtbar dazu — kein amtlicher Wert, kein Gutachten.
 */
export async function PriceEstimateCard({
  estimate,
  priceCents,
  locale,
  currency,
  eurToAll,
}: {
  estimate: EstimateResult;
  priceCents: number;
  locale: Locale;
  currency: Currency;
  eurToAll: number;
}) {
  const t = await getTranslations('estimate');
  const standing = priceStanding(priceCents, estimate);
  const { icon: Icon, tone } = STANDING[standing];

  const price = (cents: number) => formatPrice(cents, { currency, locale, eurToAll });

  return (
    <section className="bg-card text-card-foreground rounded-xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{t('title')}</h2>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
            tone,
          )}
        >
          <Icon className="size-3.5" aria-hidden />
          {t(standing)}
        </span>
      </div>

      <p className="mt-3 text-lg font-semibold tracking-tight">
        {t('range', { low: price(estimate.lowCents), high: price(estimate.highCents) })}
      </p>
      <p className="text-muted-foreground mt-0.5 text-sm">
        {t('average', { value: price(estimate.averageCents) })}
      </p>

      {/* Ein schlichter Balken: wo der Preis dieses Inserats in der Spanne liegt. */}
      <div className="bg-muted relative mt-4 h-1.5 rounded-full">
        <div
          className="bg-primary absolute top-1/2 size-3 -translate-y-1/2 rounded-full ring-2 ring-white dark:ring-neutral-900"
          style={{
            left: `${Math.min(100, Math.max(0, ((priceCents - estimate.lowCents) / Math.max(1, estimate.highCents - estimate.lowCents)) * 100))}%`,
          }}
        />
      </div>

      <p className="text-muted-foreground mt-4 text-xs">
        {estimate.scope === 'model'
          ? t('basedOn', { count: estimate.sampleSize })
          : t('basedOnBrand', { count: estimate.sampleSize })}
      </p>

      <p className="text-muted-foreground mt-2 flex items-start gap-1.5 text-xs">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <span>{t('disclaimer')}</span>
      </p>
    </section>
  );
}
