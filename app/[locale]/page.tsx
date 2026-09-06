import type { Metadata } from 'next';
import { ArrowRight, BadgeCheck, Gauge, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Button } from '@/components/ui/button';
import { BrandGrid } from '@/features/home/components/brand-grid';
import { DealerGrid } from '@/features/home/components/dealer-grid';
import { SiteJsonLd } from '@/features/home/components/site-json-ld';
import { VehicleSection } from '@/features/home/components/vehicle-section';
import {
  getFeaturedDealers, getFeaturedVehicles, getPopularBrands, getRecentVehicles,
} from '@/features/home/queries';
import { HeroSearch } from '@/features/search/components/hero-search';
import { getEurToAllRate } from '@/features/search/data';
import { getCurrency } from '@/lib/currency-server';
import type { Locale } from '@/lib/i18n/routing';
import { alternatesFor } from '@/lib/seo/alternates';
import { Link } from '@/lib/i18n/navigation';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  // Titel und Beschreibung kommen aus dem Layout; hier zählt der Verweis auf
  // die Sprachfassungen. Ohne ihn konkurrieren `/`, `/de` und `/en`
  // miteinander, statt sich als Übersetzungen zu erkennen.
  return { alternates: alternatesFor('/', locale as Locale) };
}

const VALUE_PROPS = [
  { icon: ShieldCheck, title: 'customsTitle', body: 'customsBody' },
  { icon: BadgeCheck, title: 'verifiedTitle', body: 'verifiedBody' },
  { icon: SlidersHorizontal, title: 'searchTitle', body: 'searchBody' },
  { icon: Gauge, title: 'freeTitle', body: 'freeBody' },
] as const;

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('home');
  const brand = await getTranslations('brand');

  // Alle Abschnitte kommen aus der Datenbank; es gibt keine Platzhalterlisten.
  const [featured, recent, brands, dealers, currency, eurToAll] = await Promise.all([
    getFeaturedVehicles(6),
    getRecentVehicles(6),
    getPopularBrands(12),
    getFeaturedDealers(4),
    getCurrency(),
    getEurToAllRate(),
  ]);

  return (
    <>
      <SiteJsonLd locale={locale as Locale} />

      {/* Hero: setzt den dunklen Kopfbereich fort, die Suchkarte liegt hell darauf. */}
      <section className="bg-ink text-ink-foreground relative overflow-hidden">
        <div
          aria-hidden
          className="bg-primary/25 pointer-events-none absolute -top-40 start-1/2 size-[42rem] -translate-x-1/2 rounded-full blur-[140px]"
        />
        <div className="lv-container relative pt-14 pb-20 sm:pt-20 sm:pb-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-primary text-sm font-semibold tracking-wide">
              {brand('tagline')}
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              {t('hero.title')}
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base text-balance text-white/70 sm:text-lg">
              {t('hero.subtitle')}
            </p>
          </div>

          <div className="mx-auto mt-10 max-w-5xl">
            <HeroSearch />
          </div>
        </div>
      </section>

      <VehicleSection
        title={t('featured.title')} subtitle={t('featured.subtitle')}
        allLabel={t('featured.all')} allHref={{ sort: 'relevance' }}
        vehicles={featured} locale={locale as Locale}
        currency={currency} eurToAll={eurToAll} priority
      />

      <BrandGrid brands={brands} />

      <VehicleSection
        title={t('recent.title')} subtitle={t('recent.subtitle')}
        allLabel={t('recent.all')} allHref={{ sort: 'newest' }}
        vehicles={recent} locale={locale as Locale}
        currency={currency} eurToAll={eurToAll}
      />

      <DealerGrid dealers={dealers} />

      {/* Warum LEVIZ */}
      <section className="lv-container py-16 sm:py-20">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {t('why.title')}
          </h2>
          <p className="text-muted-foreground mt-3 text-base">{t('why.subtitle')}</p>
        </div>

        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {VALUE_PROPS.map(({ icon: Icon, title, body }) => (
            <li
              key={title}
              className="bg-card text-card-foreground shadow-card hover:shadow-card-hover rounded-xl border p-6 transition-shadow"
            >
              <span className="bg-primary/10 text-primary inline-flex size-10 items-center justify-center rounded-lg">
                <Icon className="size-5" aria-hidden />
              </span>
              <h3 className="mt-4 text-base font-semibold">{t(`why.${title}`)}</h3>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                {t(`why.${body}`)}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* Zwei Handlungsaufrufe: Bewertung und Verkauf */}
      <section className="lv-container pb-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="bg-surface text-foreground flex flex-col justify-between rounded-2xl border p-8 sm:p-10">
            <div>
              <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                {t('valuation.title')}
              </h2>
              <p className="text-muted-foreground mt-3 max-w-md text-sm leading-relaxed">
                {t('valuation.body')}
              </p>
            </div>
            <Button asChild variant="outline" size="lg" className="mt-8 self-start">
              <Link href="/valuation">
                {t('valuation.cta')}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
          </div>

          <div className="bg-ink text-ink-foreground flex flex-col justify-between rounded-2xl p-8 sm:p-10">
            <div>
              <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                {t('sellCta.title')}
              </h2>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-white/70">
                {t('sellCta.body')}
              </p>
            </div>
            <Button asChild size="lg" className="mt-8 self-start">
              <Link href="/sell/create">
                {t('sellCta.cta')}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
