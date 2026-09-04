import { BadgeCheck, Car, MapPin, Star } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import type { DealerCard as DealerCardData } from '@/features/dealers/queries';
import { Link } from '@/lib/i18n/navigation';

/** Händlerkachel für das Verzeichnis. */
export async function DealerCard({ dealer }: { dealer: DealerCardData }) {
  const t = await getTranslations('dealers');

  return (
    <Link
      href={{ pathname: '/dealer/[slug]', params: { slug: dealer.slug } }}
      className="bg-card text-card-foreground shadow-card hover:shadow-card-hover flex h-full flex-col rounded-xl border p-5 transition-shadow"
    >
      <div className="flex items-start gap-2">
        <h2 className="min-w-0 flex-1 truncate text-base font-semibold">
          {dealer.companyName}
        </h2>
        {dealer.verification === 'VERIFIED' ? (
          <BadgeCheck className="text-primary size-5 shrink-0" aria-hidden />
        ) : null}
      </div>

      {dealer.city ? (
        <p className="text-muted-foreground mt-1.5 inline-flex items-center gap-1.5 text-sm">
          <MapPin className="size-3.5" aria-hidden />
          {dealer.city.name}
          {dealer.country ? ` (${dealer.country.code})` : null}
        </p>
      ) : null}

      {dealer.description ? (
        <p className="text-muted-foreground mt-3 line-clamp-2 text-sm leading-relaxed">
          {dealer.description}
        </p>
      ) : null}

      <div className="mt-auto flex items-center justify-between gap-3 pt-4">
        <span className="inline-flex items-center gap-1.5 text-sm">
          <Car className="text-muted-foreground size-4" aria-hidden />
          <span className="font-semibold">{dealer._count.vehicles}</span>
        </span>

        {dealer.ratingCount > 0 ? (
          <span className="inline-flex items-center gap-1.5 text-sm">
            <Star className="text-featured size-4 fill-current" aria-hidden />
            <span className="font-semibold">{dealer.ratingAvg.toFixed(1)}</span>
            <span className="text-muted-foreground text-xs">({dealer.ratingCount})</span>
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">{t('noReviews')}</span>
        )}
      </div>
    </Link>
  );
}
