'use client';

import { useTranslations } from 'next-intl';

import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Field } from '@/features/auth/components/field';
import type { StepProps } from '@/features/listings/components/types';
import { CUSTOMS_VALUES, PLATE_VALUES } from '@/features/search/schema';

const NONE = '__none__';

export function StepCondition({ form, data }: StepProps) {
  const t = useTranslations('listing.fields');
  const tv = useTranslations('vehicles');
  const { register, watch, setValue, formState: { errors } } = form;

  const checkbox = (
    name: 'accidentFree' | 'serviceHistory',
    label: string,
  ) => (
    <label className="hover:bg-muted flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors">
      <input type="checkbox" className="accent-primary size-4 shrink-0" {...register(name)} />
      <span>{label}</span>
    </label>
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="condition" label={t('condition')} error={errors.condition?.message}>
          <Select
            value={watch('condition') ?? 'USED'}
            onValueChange={(value) => setValue('condition', value as 'NEW' | 'USED')}
          >
            <SelectTrigger id="condition" className="h-11 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USED">{tv('condition.USED')}</SelectItem>
              <SelectItem value="NEW">{tv('condition.NEW')}</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field id="ownersCount" label={t('owners')} error={errors.ownersCount?.message}>
          <Input id="ownersCount" type="number" inputMode="numeric" min={0} className="h-11" {...register('ownersCount')} />
        </Field>

        <Field id="warrantyMonths" label={t('warranty')} error={errors.warrantyMonths?.message}>
          <Input id="warrantyMonths" type="number" inputMode="numeric" min={0} className="h-11" {...register('warrantyMonths')} />
        </Field>

        <Field id="vin" label={t('vin')} error={errors.vin?.message}>
          <Input id="vin" maxLength={17} className="h-11 uppercase" {...register('vin')} />
        </Field>
      </div>

      <div className="space-y-0.5">
        {checkbox('accidentFree', t('accidentFree'))}
        {checkbox('serviceHistory', t('serviceHistory'))}
      </div>

      {/*
        Die Angaben des Importmarkts. Im Kosovo und in Albanien entscheidet der
        Zollstatus oft vor dem Preis, darum ein eigener, hervorgehobener Block.
      */}
      <fieldset className="bg-surface rounded-xl border p-5">
        <legend className="px-2 text-sm font-semibold">
          {tv('labels.customsStatus')} · {tv('labels.plateOrigin')}
        </legend>

        <div className="mt-2 grid gap-5 sm:grid-cols-2">
          <Field id="customsStatus" label={t('customsStatus')} error={errors.customsStatus?.message}>
            <Select
              value={watch('customsStatus') ?? 'CLEARED'}
              onValueChange={(value) => setValue('customsStatus', value as never)}
            >
              <SelectTrigger id="customsStatus" className="h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CUSTOMS_VALUES.map((value) => (
                  <SelectItem key={value} value={value}>{tv(`customs.${value}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field id="plateOrigin" label={t('plateOrigin')} error={errors.plateOrigin?.message}>
            <Select
              value={watch('plateOrigin') ?? 'RKS'}
              onValueChange={(value) => setValue('plateOrigin', value as never)}
            >
              <SelectTrigger id="plateOrigin" className="h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLATE_VALUES.map((value) => (
                  <SelectItem key={value} value={value}>{tv(`plates.${value}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field id="importedFromCode" label={t('importedFrom')} error={errors.importedFromCode?.message}>
            <Select
              value={watch('importedFromCode') || NONE}
              onValueChange={(value) => setValue('importedFromCode', value === NONE ? '' : value)}
            >
              <SelectTrigger id="importedFromCode" className="h-11 w-full">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>—</SelectItem>
                {data.importCountries.map((country) => (
                  <SelectItem key={country.code} value={country.code}>{country.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field id="registeredUntil" label={t('registeredUntil')} error={errors.registeredUntil?.message}>
            <Input id="registeredUntil" type="date" className="h-11" {...register('registeredUntil')} />
          </Field>

          <Field id="steeringSide" label={t('steering')} error={errors.steeringSide?.message}>
            <Select
              value={watch('steeringSide') ?? 'LEFT'}
              onValueChange={(value) => setValue('steeringSide', value as 'LEFT' | 'RIGHT')}
            >
              <SelectTrigger id="steeringSide" className="h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LEFT">{tv('steering.LEFT')}</SelectItem>
                <SelectItem value="RIGHT">{tv('steering.RIGHT')}</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
      </fieldset>
    </div>
  );
}
