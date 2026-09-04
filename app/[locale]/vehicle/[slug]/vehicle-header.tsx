import { BadgeCheck, Eye, Heart, MapPin, ShieldCheck, Wrench } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import {
  formatMileage, formatPower, registrationYear, variantFromTitle,
} from '@/features/vehicles/format';
import type { VehicleDetail } from '@/features/vehicles/queries';
import { formatPrice, type Currency } from '@/lib/currency';
import type { Locale } from '@/lib/i18n/routing';
import { cn } from '@/lib/utils';

/** Titel, Preis, Eckdaten und Vertrauenshinweise über der Beschreibung. */
export async function VehicleHeader({
  vehicle, locale, currency, eurToAll,
}: {
  vehicle: VehicleDetail;
  locale: Locale;
  currency: Currency;
  eurToAll: number;
}) {
  const t = await getTranslations('vehicles');
  const td = await getTranslations('vehicleDetail');

  const variant = variantFromTitle(vehicle.title, vehicle.brand.name, vehicle.model.name);
  const year = registrationYear(vehicle.firstRegistration);

  const specs = [
    year ? String(year) : null,
    vehicle.mileageKm !== null ? formatMileage(vehicle.mileageKm, locale) : null,
    vehicle.fuel ? t(`fuel.${vehicle.fuel}`) : null,
    vehicle.transmission ? t(`transmission.${vehicle.transmission}`) : null,
    vehicle.powerKw ? formatPower(vehicle.powerKw, locale) : null,
    vehicle.driveType ? t(`drive.${vehicle.driveType}`) : null,
  ].filter((entry): entry is string => Boolean(entry));

  const trust = [
    vehicle.dealer?.verification === 'VERIFIED'
      ? { icon: BadgeCheck, label: td('trust.verifiedDealer') }
      : null,
    vehicle.customsStatus === 'CLEARED'
      ? { icon: ShieldCheck, label: td('trust.customsCleared') }
      : null,
    vehicle.serviceHistory ? { icon: Wrench, label: td('trust.serviceHistory') } : null,
    vehicle.accidentFree ? { icon: ShieldCheck, label: td('trust.accidentFree') } : null,
  ].filter((entry): entry is { icon: typeof BadgeCheck; label: string } => entry !== null);

  return (
    <header className="mt-6">
      {vehicle.status === 'SOLD' ? (
        <p className="bg-destructive/10 text-destructive mb-4 rounded-lg px-4 py-3 text-sm font-medium">
          {td('soldBanner')}
        </p>
      ) : null}

      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        {vehicle.brand.name} {vehicle.model.name}
      </h1>
      {variant ? <p className="text-muted-foreground mt-1 text-base">{variant}</p> : null}

      <p className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
        {formatPrice(vehicle.priceCents, { currency, locale, eurToAll })}
        {vehicle.negotiable ? (
          <span className="text-muted-foreground ms-3 text-sm font-normal">
            {t('labels.negotiable')}
          </span>
        ) : null}
      </p>

      <ul className="mt-5 flex flex-wrap gap-x-2 gap-y-2">
        {specs.map((spec) => (
          <li
            key={spec}
            className="bg-muted rounded-lg px-3 py-1.5 text-sm font-medium"
          >
            {spec}
          </li>
        ))}
      </ul>

      {/* Zoll und Kennzeichen stehen bewusst getrennt und farblich hervorgehoben. */}
      <ul className="mt-3 flex flex-wrap gap-2">
        {vehicle.customsStatus !== 'NOT_APPLICABLE' ? (
          <li
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm font-semibold',
              vehicle.customsStatus === 'CLEARED'
                ? 'bg-success/10 text-success'
                : 'bg-warning/15 text-warning-foreground dark:text-warning',
            )}
          >
            {t(`customs.${vehicle.customsStatus}`)}
          </li>
        ) : null}
        {vehicle.plateOrigin !== 'NONE' ? (
          <li className="bg-muted rounded-lg px-3 py-1.5 text-sm font-medium">
            {t(`plates.${vehicle.plateOrigin}`)}
          </li>
        ) : null}
      </ul>

      <div className="text-muted-foreground mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        {vehicle.city ? (
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-4" aria-hidden />
            {vehicle.city.name}
          </span>
        ) : null}
        <span className="inline-flex items-center gap-1.5">
          <Eye className="size-4" aria-hidden />
          {td('stats.views', { count: vehicle.viewCount })}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Heart className="size-4" aria-hidden />
          {td('stats.favorites', { count: vehicle.favoriteCount })}
        </span>
      </div>

      {trust.length > 0 ? (
        <ul className="mt-5 flex flex-wrap gap-2">
          {trust.map(({ icon: Icon, label }) => (
            <li
              key={label}
              className="border-success/30 bg-success/5 text-success inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium"
            >
              <Icon className="size-3.5" aria-hidden />
              {label}
            </li>
          ))}
        </ul>
      ) : null}
    </header>
  );
}
