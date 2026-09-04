'use client';

import { useTranslations } from 'next-intl';

import {
  CheckboxGroup, FilterSection, RangeFilter, SelectFilter,
} from '@/features/search/components/filter-controls';
import type { FilterData, FilterUpdate } from '@/features/search/components/filter-types';
import {
  BODY_VALUES, FUEL_VALUES, TRANSMISSION_VALUES, type SearchParams,
} from '@/features/search/schema';

type SectionProps = {
  params: SearchParams;
  data: FilterData;
  update: FilterUpdate;
};

const CURRENT_YEAR = new Date().getFullYear();
const RADIUS_STEPS = [10, 25, 50, 100, 200, 500];

export function BasicFilters({ params, data, update }: SectionProps) {
  const t = useTranslations('search');
  const tv = useTranslations('vehicles');

  return (
    <FilterSection title={t('sections.basic')}>
      <SelectFilter
        id="filter-make"
        label={t('fields.make')}
        value={params.make}
        placeholder={t('options.anyMake')}
        options={data.brands.map((brand) => ({
          value: brand.slug, label: brand.name, count: brand.count,
        }))}
        onChange={(make) => update({ make, model: undefined })}
      />

      <SelectFilter
        id="filter-model"
        label={t('fields.model')}
        value={params.model}
        placeholder={t('options.anyModel')}
        disabled={!params.make || data.models.length === 0}
        options={data.models.map((model) => ({ value: model.slug, label: model.name }))}
        onChange={(model) => update({ model })}
      />

      <RangeFilter
        label={`${t('fields.priceFrom')} – ${t('fields.priceTo')}`}
        fromLabel={t('fields.priceFrom')} toLabel={t('fields.priceTo')}
        from={params.priceMin} to={params.priceMax} unit="€" step={500}
        onChange={({ from, to }) => update({ priceMin: from, priceMax: to })}
      />

      <RangeFilter
        label={`${t('fields.mileageFrom')} – ${t('fields.mileageTo')}`}
        fromLabel={t('fields.mileageFrom')} toLabel={t('fields.mileageTo')}
        from={params.mileageMin} to={params.mileageMax} unit="km" step={10000}
        onChange={({ from, to }) => update({ mileageMin: from, mileageMax: to })}
      />

      <RangeFilter
        label={`${t('fields.yearFrom')} – ${t('fields.yearTo')}`}
        fromLabel={String(CURRENT_YEAR - 20)} toLabel={String(CURRENT_YEAR)}
        from={params.yearMin} to={params.yearMax} step={1}
        onChange={({ from, to }) => update({ yearMin: from, yearMax: to })}
      />

      <CheckboxGroup
        label={tv('labels.fuel')}
        options={FUEL_VALUES.map((value) => ({ value, label: tv(`fuel.${value}`) }))}
        selected={params.fuel ?? []}
        onChange={(fuel) => update({ fuel: fuel as SearchParams['fuel'] })}
        collapseAfter={5}
        moreLabel={t('showMore')} lessLabel={t('showLess')}
      />

      <CheckboxGroup
        label={tv('labels.transmission')}
        options={TRANSMISSION_VALUES.map((value) => ({ value, label: tv(`transmission.${value}`) }))}
        selected={params.transmission ?? []}
        onChange={(transmission) => update({ transmission: transmission as SearchParams['transmission'] })}
      />

      <CheckboxGroup
        label={tv('labels.bodyType')}
        options={BODY_VALUES.map((value) => ({ value, label: tv(`body.${value}`) }))}
        selected={params.bodyType ?? []}
        onChange={(bodyType) => update({ bodyType: bodyType as SearchParams['bodyType'] })}
        columns={2} collapseAfter={6}
        moreLabel={t('showMore')} lessLabel={t('showLess')}
      />
    </FilterSection>
  );
}

export function LocationFilters({ params, data, update }: SectionProps) {
  const t = useTranslations('search');

  return (
    <FilterSection title={t('sections.location')}>
      <SelectFilter
        id="filter-city"
        label={t('fields.city')}
        value={params.city}
        placeholder={t('options.anyCity')}
        options={data.cities.map((city) => ({
          value: city.slug, label: `${city.name} (${city.countryCode})`,
        }))}
        onChange={(city) => update({ city, radius: city ? (params.radius ?? 50) : undefined })}
      />

      <SelectFilter
        id="filter-radius"
        label={t('fields.radius')}
        value={params.radius ? String(params.radius) : undefined}
        placeholder={t('options.anyRadius')}
        disabled={!params.city}
        options={RADIUS_STEPS.map((km) => ({ value: String(km), label: `${km} km` }))}
        onChange={(radius) => update({ radius: radius ? Number(radius) : undefined })}
      />
    </FilterSection>
  );
}
