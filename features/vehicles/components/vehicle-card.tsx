import { BadgeCheck, Fuel, Gauge, MapPin, Settings2, Star, Zap } from 'lucide-react';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';

import { CompareButton } from '@/features/compare/components/compare-button';
import { FavoriteButton } from '@/features/favorites/components/favorite-button';
import {
  daysSince, formatMileage, formatPower, registrationYear, variantFromTitle,
} from '@/features/vehicles/format';
import type { VehicleCard as VehicleCardData } from '@/features/search/queries';
import { formatPrice, type Currency } from '@/lib/currency';
import { formatDistanceKm } from '@/lib/geo/distance';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import { cn } from '@/lib/utils';

type Props = {
  vehicle: VehicleCardData;
  locale: Locale;
  currency: Currency;
  eurToAll: number;
  favorited: boolean;
  inCompare?: boolean;
  layout?: 'grid' | 'list';
  priority?: boolean;
};

export async function VehicleCard({
  vehicle, locale, currency, eurToAll, favorited, inCompare = false,
  layout = 'grid', priority = false,
}: Props) {
  const t = await getTranslations('vehicles');
  const image = vehicle.images[0];
  const year = registrationYear(vehicle.firstRegistration);
  const age = vehicle.publishedAt ? daysSince(vehicle.publishedAt) : null;
  const variant = variantFromTitle(vehicle.title, vehicle.brand.name, vehicle.model.name);

  const specs = [
    year ? { icon: null, text: String(year) } : null,
    vehicle.mileageKm !== null ? { icon: Gauge, text: formatMileage(vehicle.mileageKm, locale)! } : null,
    vehicle.fuel ? { icon: Fuel, text: t(`fuel.${vehicle.fuel}`) } : null,
    vehicle.transmission ? { icon: Settings2, text: t(`transmission.${vehicle.transmission}`) } : null,
    vehicle.powerKw ? { icon: Zap, text: formatPower(vehicle.powerKw, locale)! } : null,
  ].filter((entry): entry is { icon: typeof Gauge | null; text: string } => entry !== null);

  const isList = layout === 'list';

  return (
    <article
      className={cn(
        'group bg-card text-card-foreground shadow-card hover:shadow-card-hover relative flex overflow-hidden rounded-xl border transition-shadow',
        isList ? 'flex-col sm:flex-row' : 'flex-col',
      )}
    >
      {/* Bildbereich */}
      <div
        className={cn(
          'bg-muted relative shrink-0 overflow-hidden',
          isList ? 'aspect-[4/3] sm:aspect-auto sm:w-72' : 'aspect-[4/3]',
        )}
      >
        {image ? (
          <Image
            src={image.url}
            alt={image.altText ?? vehicle.title}
            fill
            priority={priority}
            sizes={isList ? '(max-width: 640px) 100vw, 288px' : '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw'}
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="text-muted-foreground flex h-full items-center justify-center text-xs">
            —
          </div>
        )}

        {vehicle.featuredScore > 0 ? (
          <span className="bg-featured text-featured-foreground absolute start-3 top-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm">
            <Star className="size-3 fill-current" aria-hidden />
            {t('badges.featured')}
          </span>
        ) : null}

        <div className="absolute end-3 top-3 z-10 flex flex-col gap-2">
          <FavoriteButton
            vehicleId={vehicle.id}
            initialFavorited={favorited}
            className="shadow-sm"
          />
          <CompareButton
            vehicleId={vehicle.id}
            initialSelected={inCompare}
            className="shadow-sm"
          />
        </div>
      </div>

      {/* Textbereich */}
      <div className="flex min-w-0 flex-1 flex-col p-4">
        <Link href={{ pathname: '/vehicle/[slug]', params: { slug: vehicle.slug } }} className="min-w-0">
          {/* Die ganze Karte wird über dieses Overlay anklickbar. */}
          <span className="absolute inset-0" aria-hidden />
          <h3 className="truncate text-base font-semibold">
            {vehicle.brand.name} {vehicle.model.name}
          </h3>
          {variant ? (
            <p className="text-muted-foreground mt-0.5 truncate text-sm">{variant}</p>
          ) : null}
        </Link>

        <ul className="text-muted-foreground mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          {specs.map((spec) => (
            <li key={spec.text} className="inline-flex items-center gap-1">
              {spec.icon ? <spec.icon className="size-3.5" aria-hidden /> : null}
              {spec.text}
            </li>
          ))}
        </ul>

        {/* Zollstatus und Kennzeichen — die Angaben, nach denen hier zuerst gefragt wird. */}
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {vehicle.customsStatus !== 'NOT_APPLICABLE' ? (
            <li
              className={cn(
                'rounded-md px-2 py-0.5 text-xs font-medium',
                vehicle.customsStatus === 'CLEARED'
                  ? 'bg-success/10 text-success'
                  : 'bg-warning/15 text-warning-foreground dark:text-warning',
              )}
            >
              {t(`customs.${vehicle.customsStatus}`)}
            </li>
          ) : null}
          {vehicle.plateOrigin !== 'NONE' ? (
            <li className="bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-xs font-medium">
              {t(`plates.${vehicle.plateOrigin}`)}
            </li>
          ) : null}
          {vehicle.condition === 'NEW' ? (
            <li className="bg-primary/10 text-primary rounded-md px-2 py-0.5 text-xs font-medium">
              {t('badges.new')}
            </li>
          ) : null}
        </ul>

        <div className="mt-auto pt-4">
          <p className="text-xl font-semibold tracking-tight">
            {formatPrice(vehicle.priceCents, { currency, locale, eurToAll })}
            {vehicle.negotiable ? (
              <span className="text-muted-foreground ms-2 text-xs font-normal">
                {t('labels.negotiable')}
              </span>
            ) : null}
          </p>

          <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            {vehicle.city ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5" aria-hidden />
                {vehicle.city.name}
                {vehicle.distanceKm !== undefined
                  ? ` · ${formatDistanceKm(vehicle.distanceKm)}`
                  : null}
              </span>
            ) : null}

            <span aria-hidden>·</span>

            {vehicle.dealer ? (
              <span className="inline-flex min-w-0 items-center gap-1">
                <span className="truncate">{vehicle.dealer.companyName}</span>
                {vehicle.dealer.verification === 'VERIFIED' ? (
                  <BadgeCheck className="text-primary size-3.5 shrink-0" aria-hidden />
                ) : null}
              </span>
            ) : (
              <span>{t('badges.private')}</span>
            )}

            {age !== null ? (
              <>
                <span aria-hidden>·</span>
                <span>
                  {age === 0 ? t('listedToday') : age === 1 ? t('listedYesterday') : t('listedDaysAgo', { days: age })}
                </span>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
