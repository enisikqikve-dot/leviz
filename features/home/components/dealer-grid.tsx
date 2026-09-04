import { ArrowRight, BadgeCheck, MapPin, Star } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { Link } from '@/lib/i18n/navigation';

type Dealer = {
  id: string;
  slug: string;
  companyName: string;
  ratingAvg: number;
  ratingCount: number;
  city: { name: string } | null;
  _count: { vehicles: number };
};

/** Geprüfte Händler mit Bewertung und aktuellem Bestand. */
export async function DealerGrid({ dealers }: { dealers: Dealer[] }) {
  if (dealers.length === 0) return null;

  const t = await getTranslations('home.dealers');
  const tv = await getTranslations('vehicles');

  return (
    <section className="lv-container py-12 sm:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('title')}</h2>
          <p className="text-muted-foreground mt-2 text-sm">{t('subtitle')}</p>
        </div>
        <Link
          href="/dealers"
          className="text-primary inline-flex items-center gap-1 text-sm font-medium hover:underline"
        >
          {t('all')}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>

      <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {dealers.map((dealer) => (
          <li key={dealer.id}>
            <Link
              href={{ pathname: '/dealer/[slug]', params: { slug: dealer.slug } }}
              className="bg-card text-card-foreground shadow-card hover:shadow-card-hover flex h-full flex-col rounded-xl border p-5 transition-shadow"
            >
              <div className="flex items-start gap-2">
                <h3 className="min-w-0 flex-1 truncate text-base font-semibold">
                  {dealer.companyName}
                </h3>
                <BadgeCheck className="text-primary size-4 shrink-0" aria-hidden />
              </div>

              {dealer.city ? (
                <p className="text-muted-foreground mt-1 inline-flex items-center gap-1 text-xs">
                  <MapPin className="size-3.5" aria-hidden />
                  {dealer.city.name}
                </p>
              ) : null}

              <div className="mt-4 flex items-center gap-1.5">
                <Star className="text-featured size-4 fill-current" aria-hidden />
                <span className="text-sm font-semibold">{dealer.ratingAvg.toFixed(1)}</span>
                <span className="text-muted-foreground text-xs">({dealer.ratingCount})</span>
              </div>

              <p className="text-muted-foreground mt-auto pt-4 text-sm">
                <span className="text-foreground font-semibold">{dealer._count.vehicles}</span>{' '}
                {tv('category.CAR').toLowerCase()}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
