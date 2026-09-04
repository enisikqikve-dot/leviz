'use client';

import { useTranslations } from 'next-intl';

import {
  CheckboxGroup, FilterSection, RangeFilter, SelectFilter, ToggleFilter,
} from '@/features/search/components/filter-controls';
import type { FilterData, FilterUpdate } from '@/features/search/components/filter-types';
import { CUSTOMS_VALUES, PLATE_VALUES, type SearchParams } from '@/features/search/schema';

type SectionProps = {
  params: SearchParams;
  data: FilterData;
  update: FilterUpdate;
};

export function AdvancedFilters({ params, data, update }: SectionProps) {
  const t = useTranslations('search');
  const tv = useTranslations('vehicles');

  return (
    <FilterSection title={t('sections.advanced')} defaultOpen={false}>
      {/* Zoll und Kennzeichen stehen bewusst ganz oben: danach wird im Kosovo
          und in Albanien als Erstes gefragt. */}
      <CheckboxGroup
        label={tv('labels.customsStatus')}
        options={CUSTOMS_VALUES.map((value) => ({ value, label: tv(`customs.${value}`) }))}
        selected={params.customs ?? []}
        onChange={(customs) => update({ customs: customs as SearchParams['customs'] })}
      />

      <CheckboxGroup
        label={tv('labels.plateOrigin')}
        options={PLATE_VALUES.map((value) => ({ value, label: tv(`plates.${value}`) }))}
        selected={params.plates ?? []}
        onChange={(plates) => update({ plates: plates as SearchParams['plates'] })}
        columns={2}
      />

      <CheckboxGroup
        label={tv('labels.importedFrom')}
        options={data.countries.map((country) => ({ value: country.code, label: country.name }))}
        selected={params.importedFrom ?? []}
        onChange={(importedFrom) => update({ importedFrom })}
        columns={2} collapseAfter={6}
        moreLabel={t('showMore')} lessLabel={t('showLess')}
      />

      <SelectFilter
        id="filter-steering"
        label={tv('labels.steering')}
        value={params.steering}
        placeholder={t('options.any')}
        options={[
          { value: 'LEFT', label: tv('steering.LEFT') },
          { value: 'RIGHT', label: tv('steering.RIGHT') },
        ]}
        onChange={(steering) => update({ steering: steering as SearchParams['steering'] })}
      />

      <RangeFilter
        label={`${t('fields.powerFrom')} – ${t('fields.powerTo')}`}
        fromLabel={t('fields.powerFrom')} toLabel={t('fields.powerTo')}
        from={params.powerMin} to={params.powerMax} unit="kW" step={10}
        onChange={({ from, to }) => update({ powerMin: from, powerMax: to })}
      />
    </FilterSection>
  );
}

export function SellerFilters({
  params, update,
}: {
  params: SearchParams;
  update: FilterUpdate;
}) {
  const t = useTranslations('search');

  return (
    <FilterSection title={t('sections.seller')} defaultOpen={false}>
      <SelectFilter
        id="filter-seller"
        label={t('fields.sellerType')}
        value={params.sellerType}
        placeholder={t('options.any')}
        options={[
          { value: 'PRIVATE', label: t('options.privateSeller') },
          { value: 'DEALER', label: t('options.dealerSeller') },
        ]}
        onChange={(sellerType) => update({ sellerType: sellerType as SearchParams['sellerType'] })}
      />

      <div className="space-y-0.5">
        <ToggleFilter label={t('toggles.accidentFree')} checked={Boolean(params.accidentFree)}
          onChange={(value) => update({ accidentFree: value || undefined })} />
        <ToggleFilter label={t('toggles.serviceHistory')} checked={Boolean(params.serviceHistory)}
          onChange={(value) => update({ serviceHistory: value || undefined })} />
        <ToggleFilter label={t('toggles.warranty')} checked={Boolean(params.warranty)}
          onChange={(value) => update({ warranty: value || undefined })} />
        <ToggleFilter label={t('toggles.vat')} checked={Boolean(params.vat)}
          onChange={(value) => update({ vat: value || undefined })} />
        <ToggleFilter label={t('toggles.financing')} checked={Boolean(params.financing)}
          onChange={(value) => update({ financing: value || undefined })} />
      </div>
    </FilterSection>
  );
}

export function EquipmentFilters({ params, data, update }: SectionProps) {
  const t = useTranslations('search');

  // Die im Filter prominenten Merkmale zuerst, der Rest hinter mehr anzeigen.
  const ordered = [...data.features].sort(
    (a, b) => Number(b.popular) - Number(a.popular) || a.label.localeCompare(b.label),
  );

  return (
    <FilterSection title={t('sections.equipment')} defaultOpen={false}>
      <CheckboxGroup
        label={t('sections.equipment')}
        options={ordered.map((feature) => ({ value: feature.slug, label: feature.label }))}
        selected={params.features ?? []}
        onChange={(features) => update({ features })}
        columns={2} collapseAfter={12}
        moreLabel={t('showMore')} lessLabel={t('showLess')}
      />
    </FilterSection>
  );
}
