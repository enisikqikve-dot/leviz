import { getTranslations } from 'next-intl/server';

import type { VehicleDetail } from '@/features/vehicles/queries';
import {
  formatConsumption, formatMileage, formatPower, formatRegistration,
} from '@/features/vehicles/format';
import { formatNumber } from '@/lib/currency';
import type { Locale } from '@/lib/i18n/routing';

type Row = { label: string; value: string };

const NAME_FIELD: Record<Locale, 'nameSq' | 'nameDe' | 'nameEn'> = {
  sq: 'nameSq', de: 'nameDe', en: 'nameEn',
};

/**
 * Technische Daten als Beschreibungsliste. Leere Felder werden weggelassen
 * statt mit einem Strich gefuellt — eine kurze, vollstaendige Liste ist
 * ehrlicher als eine lange mit Luecken.
 */
export async function SpecList({
  vehicle,
  locale,
}: {
  vehicle: VehicleDetail;
  locale: Locale;
}) {
  const t = await getTranslations('vehicles');
  const td = await getTranslations('vehicleDetail');
  const number = (value: number) => formatNumber(value, locale);

  const rows: (Row | null)[] = [
    vehicle.firstRegistration
      ? { label: t('labels.firstRegistration'), value: formatRegistration(vehicle.firstRegistration, locale)! }
      : null,
    vehicle.mileageKm !== null
      ? { label: t('labels.mileage'), value: formatMileage(vehicle.mileageKm, locale)! }
      : null,
    vehicle.fuel ? { label: t('labels.fuel'), value: t(`fuel.${vehicle.fuel}`) } : null,
    vehicle.transmission
      ? { label: t('labels.transmission'), value: t(`transmission.${vehicle.transmission}`) }
      : null,
    vehicle.powerKw
      ? { label: t('labels.power'), value: `${formatPower(vehicle.powerKw, locale)} (${vehicle.powerKw} kW)` }
      : null,
    vehicle.bodyType ? { label: t('labels.bodyType'), value: t(`body.${vehicle.bodyType}`) } : null,
    vehicle.driveType ? { label: t('labels.drive'), value: t(`drive.${vehicle.driveType}`) } : null,
    vehicle.displacementCcm
      ? { label: 'Cm³', value: `${number(vehicle.displacementCcm)} cm³` }
      : null,
    vehicle.cylinders ? { label: 'Cilindra', value: String(vehicle.cylinders) } : null,
    vehicle.doors ? { label: t('labels.doors'), value: String(vehicle.doors) } : null,
    vehicle.seats ? { label: t('labels.seats'), value: String(vehicle.seats) } : null,
    vehicle.color ? { label: t('labels.color'), value: t(`colors.${vehicle.color}`) } : null,
    vehicle.interiorColor
      ? { label: t('labels.interiorColor'), value: t(`colors.${vehicle.interiorColor}`) }
      : null,
    vehicle.emissionClass
      ? { label: t('labels.emission'), value: t(`emission.${vehicle.emissionClass}`) }
      : null,
    vehicle.co2Gkm !== null ? { label: t('labels.co2'), value: `${vehicle.co2Gkm} g/km` } : null,
    vehicle.consumptionCombined !== null
      ? { label: t('labels.consumption'), value: formatConsumption(vehicle.consumptionCombined, locale)! }
      : null,
    vehicle.electricRangeKm
      ? { label: t('labels.range'), value: `${number(vehicle.electricRangeKm)} km` }
      : null,
    vehicle.batteryCapacityKwh
      ? { label: t('labels.battery'), value: `${vehicle.batteryCapacityKwh} kWh` }
      : null,

    // Die Angaben, die den regionalen Markt ausmachen.
    vehicle.customsStatus !== 'NOT_APPLICABLE'
      ? { label: t('labels.customsStatus'), value: t(`customs.${vehicle.customsStatus}`) }
      : null,
    vehicle.plateOrigin !== 'NONE'
      ? { label: t('labels.plateOrigin'), value: t(`plates.${vehicle.plateOrigin}`) }
      : null,
    vehicle.importedFrom
      ? { label: t('labels.importedFrom'), value: vehicle.importedFrom[NAME_FIELD[locale]] }
      : null,
    vehicle.registeredUntil
      ? { label: t('labels.registeredUntil'), value: formatRegistration(vehicle.registeredUntil, locale)! }
      : null,
    { label: t('labels.steering'), value: t(`steering.${vehicle.steeringSide}`) },

    vehicle.ownersCount ? { label: t('labels.owners'), value: String(vehicle.ownersCount) } : null,
    vehicle.warrantyMonths
      ? { label: t('labels.warranty'), value: `${vehicle.warrantyMonths} ${t('labels.months')}` }
      : null,
    vehicle.vin ? { label: t('labels.vin'), value: vehicle.vin } : null,
  ];

  const visible = rows.filter((row): row is Row => row !== null);

  return (
    <section id="specifications" className="scroll-mt-24">
      <h2 className="text-lg font-semibold">{td('sections.specifications')}</h2>
      <dl className="mt-4 grid gap-x-8 gap-y-0 sm:grid-cols-2">
        {visible.map((row) => (
          <div
            key={row.label}
            className="flex items-baseline justify-between gap-4 border-b py-2.5 text-sm"
          >
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd className="text-end font-medium">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
