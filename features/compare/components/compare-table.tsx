import { getTranslations } from 'next-intl/server';

import { CompareActions } from '@/features/compare/components/compare-actions';
import type { CompareVehicle } from '@/features/compare/queries';
import { buildComparisonRows, type RowInput } from '@/features/compare/rows';
import {
  formatConsumption, formatMileage, formatPower, kwToHp, registrationYear,
} from '@/features/vehicles/format';
import { formatPrice, type Currency } from '@/lib/currency';
import type { Locale } from '@/lib/i18n/routing';

const NAME_FIELD: Record<Locale, 'nameSq' | 'nameDe' | 'nameEn'> = {
  sq: 'nameSq', de: 'nameDe', en: 'nameEn',
};

export async function CompareTable({
  vehicles, locale, currency, eurToAll,
}: {
  vehicles: CompareVehicle[];
  locale: Locale;
  currency: Currency;
  eurToAll: number;
}) {
  const t = await getTranslations('vehicles');
  const td = await getTranslations('vehicleDetail');

  const pick = <T,>(fn: (vehicle: CompareVehicle) => T) => vehicles.map(fn);

  // Alle Ausstattungsmerkmale, die mindestens ein Fahrzeug hat.
  const allFeatures = [
    ...new Map(
      vehicles
        .flatMap((vehicle) => vehicle.features.map((entry) => entry.feature))
        .map((feature) => [feature.slug, feature]),
    ).values(),
  ].sort((a, b) => a[NAME_FIELD[locale]].localeCompare(b[NAME_FIELD[locale]]));

  const specs: RowInput[] = [
    {
      key: 'price', label: t('labels.price'),
      values: pick((v) => formatPrice(v.priceCents, { currency, locale, eurToAll })),
      numbers: pick((v) => v.priceCents), lowerIsBetter: true,
    },
    {
      key: 'year', label: t('labels.firstRegistration'),
      values: pick((v) => registrationYear(v.firstRegistration)?.toString() ?? null),
      numbers: pick((v) => registrationYear(v.firstRegistration)),
    },
    {
      key: 'mileage', label: t('labels.mileage'),
      values: pick((v) => formatMileage(v.mileageKm, locale)),
      numbers: pick((v) => v.mileageKm), lowerIsBetter: true,
    },
    {
      key: 'power', label: t('labels.power'),
      values: pick((v) => formatPower(v.powerKw, locale)),
      numbers: pick((v) => (v.powerKw ? kwToHp(v.powerKw) : null)),
    },
    { key: 'fuel', label: t('labels.fuel'), values: pick((v) => (v.fuel ? t(`fuel.${v.fuel}`) : null)) },
    { key: 'transmission', label: t('labels.transmission'), values: pick((v) => (v.transmission ? t(`transmission.${v.transmission}`) : null)) },
    { key: 'drive', label: t('labels.drive'), values: pick((v) => (v.driveType ? t(`drive.${v.driveType}`) : null)) },
    { key: 'body', label: t('labels.bodyType'), values: pick((v) => (v.bodyType ? t(`body.${v.bodyType}`) : null)) },
    {
      key: 'consumption', label: t('labels.consumption'),
      values: pick((v) => formatConsumption(v.consumptionCombined, locale)),
      numbers: pick((v) => v.consumptionCombined), lowerIsBetter: true,
    },
    { key: 'emission', label: t('labels.emission'), values: pick((v) => (v.emissionClass ? t(`emission.${v.emissionClass}`) : null)) },
    { key: 'customs', label: t('labels.customsStatus'), values: pick((v) => t(`customs.${v.customsStatus}`)) },
    { key: 'plates', label: t('labels.plateOrigin'), values: pick((v) => t(`plates.${v.plateOrigin}`)) },
    { key: 'imported', label: t('labels.importedFrom'), values: pick((v) => v.importedFrom?.[NAME_FIELD[locale]] ?? null) },
    { key: 'steering', label: t('labels.steering'), values: pick((v) => t(`steering.${v.steeringSide}`)) },
    { key: 'accident', label: t('labels.accidentFree'), values: pick((v) => (v.accidentFree ? '✓' : '—')) },
    { key: 'service', label: t('labels.serviceHistory'), values: pick((v) => (v.serviceHistory ? '✓' : '—')) },
    { key: 'owners', label: t('labels.owners'), values: pick((v) => v.ownersCount?.toString() ?? null), numbers: pick((v) => v.ownersCount), lowerIsBetter: true },
    { key: 'city', label: td('sections.location'), values: pick((v) => v.city?.name ?? null) },
  ];

  const featureRows: RowInput[] = allFeatures.map((feature) => ({
    key: `feature-${feature.slug}`,
    label: feature[NAME_FIELD[locale]],
    values: pick((vehicle) =>
      vehicle.features.some((entry) => entry.feature.slug === feature.slug) ? '✓' : '—',
    ),
  }));

  const rows = buildComparisonRows(specs);
  const features = buildComparisonRows(featureRows);

  return (
    <CompareActions
      vehicles={vehicles.map((vehicle) => ({
        id: vehicle.id,
        slug: vehicle.slug,
        title: `${vehicle.brand.name} ${vehicle.model.name}`,
        imageUrl: vehicle.images[0]?.url ?? null,
        price: formatPrice(vehicle.priceCents, { currency, locale, eurToAll }),
      }))}
      rows={rows}
      featureRows={features}
      equipmentLabel={td('sections.equipment')}
    />
  );
}
