import type { Metadata } from 'next';
import { Check } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Button } from '@/components/ui/button';
import { BuyButton } from '@/features/packages/components/buy-button';
import { getActiveSubscription, listPackages, type PackageCard } from '@/features/packages/queries';
import { getEurToAllRate } from '@/features/search/data';
import { getSessionUser } from '@/lib/auth/guards';
import { formatPrice } from '@/lib/currency';
import { getCurrency } from '@/lib/currency-server';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import { cn } from '@/lib/utils';

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'pricing' });
  return { title: t('title'), description: t('metaDescription') };
}

export default async function PricingPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('pricing');
  const [packages, currency, eurToAll, user] = await Promise.all([
    listPackages(locale as Locale),
    getCurrency(),
    getEurToAllRate(),
    getSessionUser(),
  ]);

  const subscription = user ? await getActiveSubscription(user.id) : null;
  const currentPackageId = subscription?.package.id ?? null;

  const groups = [
    { key: 'forPrivate', items: packages.filter((p) => !p.isDealerPackage) },
    { key: 'forDealers', items: packages.filter((p) => p.isDealerPackage) },
  ] as const;

  /** Die Merkmale eines Pakets als lesbare Zeilen. */
  function featureLines(pkg: PackageCard): string[] {
    const lines = [
      pkg.listingLimit === null
        ? t('listingsUnlimited')
        : t('listingsLimited', { count: pkg.listingLimit }),
      t('duration', { days: pkg.listingDurationDays }),
      t('photos', { count: pkg.photoLimit }),
    ];

    if (pkg.featuredDays > 0) lines.push(t('featuredDays', { days: pkg.featuredDays }));
    else if (pkg.featuredScore > 0) lines.push(t('betterPlacement'));

    if (pkg.hasStatistics) lines.push(t('statistics'));
    if (pkg.hasBulkTools) lines.push(t('bulkTools'));
    if (pkg.hasApiAccess) lines.push(t('apiAccess'));

    return lines;
  }

  /** Preis samt Abrechnungszeitraum. */
  function priceLabel(pkg: PackageCard): { amount: string; period: string | null } {
    if (pkg.priceCents === 0) return { amount: t('free'), period: null };

    return {
      amount: formatPrice(pkg.priceCents, { currency, locale: locale as Locale, eurToAll }),
      period:
        pkg.interval === 'MONTHLY'
          ? t('monthly')
          : pkg.interval === 'YEARLY'
            ? t('yearly')
            : t('oneTime'),
    };
  }

  return (
    <div className="lv-container py-8 sm:py-12">
      <header className="max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('title')}</h1>
        <p className="text-muted-foreground mt-2 text-sm sm:text-base">{t('subtitle')}</p>
      </header>

      {groups.map(({ key, items }) =>
        items.length === 0 ? null : (
          <section key={key} className="mt-10">
            <h2 className="text-lg font-semibold">{t(key)}</h2>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {items.map((pkg) => {
                const price = priceLabel(pkg);
                const isCurrent = pkg.id === currentPackageId;
                // Die kostenlose Stufe gilt ohne Buchung und braucht keine Schaltfläche.
                const isFree = pkg.priceCents === 0;

                return (
                  <article
                    key={pkg.id}
                    className={cn(
                      'bg-card text-card-foreground flex flex-col rounded-xl border p-5',
                      isCurrent && 'border-primary ring-primary/20 ring-2',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold">{pkg.name}</h3>
                      {isCurrent ? (
                        <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-medium">
                          {t('currentPackage')}
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-3 flex items-baseline gap-1.5">
                      <span className="text-2xl font-semibold tracking-tight">{price.amount}</span>
                      {price.period ? (
                        <span className="text-muted-foreground text-sm">{price.period}</span>
                      ) : null}
                    </p>

                    {pkg.description ? (
                      <p className="text-muted-foreground mt-2 text-sm">{pkg.description}</p>
                    ) : null}

                    <ul className="mt-4 flex-1 space-y-2 text-sm">
                      {featureLines(pkg).map((entry) => (
                        <li key={entry} className="flex items-start gap-2">
                          <Check className="text-success mt-0.5 size-4 shrink-0" aria-hidden />
                          <span>{entry}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-5">
                      {isFree || isCurrent ? (
                        <Button variant="outline" className="w-full" disabled>
                          {isCurrent ? t('currentPackage') : t('free')}
                        </Button>
                      ) : user ? (
                        <BuyButton label={t('choose')} packageId={pkg.id} />
                      ) : (
                        <Button asChild variant="outline" className="w-full">
                          <Link href="/login">{t('loginToBuy')}</Link>
                        </Button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ),
      )}

      <p className="text-muted-foreground mt-10 max-w-2xl text-xs">{t('note')}</p>
    </div>
  );
}
