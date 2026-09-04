import { ArrowRight } from 'lucide-react';

import { getFavoriteIds } from '@/features/favorites/queries';
import type { VehicleCard as VehicleCardData } from '@/features/search/queries';
import { VehicleCard } from '@/features/vehicles/components/vehicle-card';
import type { Currency } from '@/lib/currency';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';

/** Abschnitt der Startseite mit Überschrift und einer Reihe Fahrzeugkarten. */
export async function VehicleSection({
  title, subtitle, allLabel, allHref, vehicles, locale, currency, eurToAll, priority = false,
}: {
  title: string;
  subtitle?: string;
  /** Ohne Beschriftung entfaellt der Verweis auf die vollstaendige Liste. */
  allLabel?: string;
  allHref: Record<string, string>;
  vehicles: VehicleCardData[];
  locale: Locale;
  currency: Currency;
  eurToAll: number;
  priority?: boolean;
}) {
  if (vehicles.length === 0) return null;

  const favorites = await getFavoriteIds(vehicles.map((vehicle) => vehicle.id));

  return (
    <section className="lv-container py-12 sm:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
          {subtitle ? (
            <p className="text-muted-foreground mt-2 text-sm">{subtitle}</p>
          ) : null}
        </div>
        {allLabel ? (
          <Link
            href={{ pathname: '/search', query: allHref }}
            className="text-primary inline-flex items-center gap-1 text-sm font-medium hover:underline"
          >
            {allLabel}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        ) : null}
      </div>

      <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {vehicles.map((vehicle, index) => (
          <li key={vehicle.id}>
            <VehicleCard
              vehicle={vehicle}
              locale={locale}
              currency={currency}
              eurToAll={eurToAll}
              favorited={favorites.has(vehicle.id)}
              priority={priority && index < 3}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
