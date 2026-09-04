'use client';

import { useTranslations } from 'next-intl';

import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Field } from '@/features/auth/components/field';
import type { StepProps } from '@/features/listings/components/types';
import {
  BODY_VALUES, COLOR_VALUES, DRIVE_VALUES, EMISSION_VALUES,
  FUEL_VALUES, TRANSMISSION_VALUES,
} from '@/features/search/schema';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 1989 }, (_, i) => CURRENT_YEAR - i);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

type EnumField =
  | 'fuel' | 'transmission' | 'bodyType' | 'driveType'
  | 'color' | 'interiorColor' | 'emissionClass';

/**
 * Auswahlfeld für eines der Aufzählungsfelder.
 *
 * Bewusst außerhalb der Schrittkomponente: eine innerhalb des Renderns
 * erzeugte Komponente bekommt bei jedem Tastendruck eine neue Identität und
 * hängt ihren Teilbaum neu ein — sichtbar als Flackern und verlorener Fokus.
 */
function EnumSelect({
  form, name, values, namespace, label,
}: Pick<StepProps, 'form'> & {
  name: EnumField;
  values: readonly string[];
  namespace: string;
  label: string;
}) {
  const tv = useTranslations('vehicles');
  const { watch, setValue, formState: { errors } } = form;

  return (
    <Field id={name} label={label} error={errors[name]?.message}>
      <Select
        value={(watch(name) as string | undefined) ?? ''}
        onValueChange={(value) => setValue(name, value as never, { shouldValidate: true })}
      >
        <SelectTrigger id={name} className="h-11 w-full">
          <SelectValue placeholder="—" />
        </SelectTrigger>
        <SelectContent>
          {values.map((value) => (
            <SelectItem key={value} value={value}>{tv(`${namespace}.${value}`)}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

export function StepTechnical({ form }: StepProps) {
  const t = useTranslations('listing.fields');
  const { register, watch, setValue, formState: { errors } } = form;

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field id="registrationYear" label={t('registrationYear')} error={errors.registrationYear?.message}>
        <Select
          value={watch('registrationYear') ? String(watch('registrationYear')) : ''}
          onValueChange={(value) => setValue('registrationYear', Number(value), { shouldValidate: true })}
        >
          <SelectTrigger id="registrationYear" className="h-11 w-full">
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            {YEARS.map((year) => (
              <SelectItem key={year} value={String(year)}>{year}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field id="registrationMonth" label={t('registrationMonth')} error={errors.registrationMonth?.message}>
        <Select
          value={String(watch('registrationMonth') ?? 1)}
          onValueChange={(value) => setValue('registrationMonth', Number(value))}
        >
          <SelectTrigger id="registrationMonth" className="h-11 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((month) => (
              <SelectItem key={month} value={String(month)}>
                {String(month).padStart(2, '0')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field id="mileageKm" label={t('mileage')} error={errors.mileageKm?.message}>
        <Input id="mileageKm" type="number" inputMode="numeric" min={0} className="h-11" {...register('mileageKm')} />
      </Field>

      <Field id="powerKw" label={t('power')} error={errors.powerKw?.message}>
        <Input id="powerKw" type="number" inputMode="numeric" min={1} className="h-11" {...register('powerKw')} />
      </Field>

      <EnumSelect form={form} name="fuel" values={FUEL_VALUES} namespace="fuel" label={t('fuel')} />
      <EnumSelect form={form} name="transmission" values={TRANSMISSION_VALUES} namespace="transmission" label={t('transmission')} />
      <EnumSelect form={form} name="bodyType" values={BODY_VALUES} namespace="body" label={t('bodyType')} />
      <EnumSelect form={form} name="driveType" values={DRIVE_VALUES} namespace="drive" label={t('driveType')} />
      <EnumSelect form={form} name="color" values={COLOR_VALUES} namespace="colors" label={t('color')} />
      <EnumSelect form={form} name="interiorColor" values={COLOR_VALUES} namespace="colors" label={t('interiorColor')} />
      <EnumSelect form={form} name="emissionClass" values={EMISSION_VALUES} namespace="emission" label={t('emission')} />

      <Field id="doors" label={t('doors')} error={errors.doors?.message}>
        <Input id="doors" type="number" inputMode="numeric" min={0} className="h-11" {...register('doors')} />
      </Field>

      <Field id="seats" label={t('seats')} error={errors.seats?.message}>
        <Input id="seats" type="number" inputMode="numeric" min={0} className="h-11" {...register('seats')} />
      </Field>

      <Field id="displacementCcm" label={t('displacement')} error={errors.displacementCcm?.message}>
        <Input id="displacementCcm" type="number" inputMode="numeric" min={0} className="h-11" {...register('displacementCcm')} />
      </Field>
    </div>
  );
}
