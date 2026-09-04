'use client';

import { useTranslations } from 'next-intl';

import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Field } from '@/features/auth/components/field';
import { ImageUploader } from '@/features/listings/components/image-uploader';
import { DescribeButton } from '@/features/ai/components/describe-button';
import type { StepProps } from '@/features/listings/components/types';

export function StepFeatures({ form, data }: StepProps) {
  const selected = form.watch('features') ?? [];

  const toggle = (slug: string) => {
    form.setValue(
      'features',
      selected.includes(slug)
        ? selected.filter((entry) => entry !== slug)
        : [...selected, slug],
      { shouldValidate: true },
    );
  };

  // Nach Gruppe bündeln, damit die lange Liste überschaubar bleibt.
  const groups = new Map<string, typeof data.features>();
  for (const feature of data.features) {
    const list = groups.get(feature.group) ?? [];
    list.push(feature);
    groups.set(feature.group, list);
  }

  return (
    <div className="space-y-6">
      {[...groups.entries()].map(([group, features]) => (
        <fieldset key={group}>
          <legend className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
            {group}
          </legend>
          <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <label
                key={feature.slug}
                className="hover:bg-muted flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors"
              >
                <input
                  type="checkbox"
                  className="accent-primary size-4 shrink-0"
                  checked={selected.includes(feature.slug)}
                  onChange={() => toggle(feature.slug)}
                />
                <span className="truncate">{feature.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

export function StepImages({ form }: StepProps) {
  const t = useTranslations('listing.images');
  const images = form.watch('images') ?? [];
  const error = form.formState.errors.images?.message;

  return (
    <div className="space-y-4">
      <ImageUploader
        images={images}
        onChange={(next) => form.setValue('images', next, { shouldValidate: true })}
      />
      <p className="text-muted-foreground text-xs">{t('firstIsMain')}</p>
      {error ? (
        <p role="alert" className="text-destructive text-sm">{error}</p>
      ) : null}
    </div>
  );
}

export function StepPrice({ form }: StepProps) {
  const t = useTranslations('listing.fields');
  const { register, formState: { errors } } = form;

  const checkbox = (
    name: 'negotiable' | 'vatDeductible' | 'financingAvailable' | 'leasingAvailable',
    label: string,
  ) => (
    <label className="hover:bg-muted flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors">
      <input type="checkbox" className="accent-primary size-4 shrink-0" {...register(name)} />
      <span>{label}</span>
    </label>
  );

  return (
    <div className="space-y-6">
      <Field id="priceEur" label={t('price')} error={errors.priceEur?.message}>
        <Input
          id="priceEur" type="number" inputMode="numeric" min={100} step={50}
          className="h-12 text-lg font-semibold" {...register('priceEur')}
        />
      </Field>

      <div className="space-y-0.5">
        {checkbox('negotiable', t('negotiable'))}
        {checkbox('vatDeductible', t('vat'))}
        {checkbox('financingAvailable', t('financing'))}
        {checkbox('leasingAvailable', t('leasing'))}
      </div>
    </div>
  );
}

export function StepLocation({ form, data }: StepProps) {
  const t = useTranslations('listing.fields');
  const { register, watch, setValue, formState: { errors } } = form;

  return (
    <div className="space-y-5">
      <Field id="citySlug" label={t('city')} error={errors.citySlug?.message}>
        <Select
          value={watch('citySlug') ?? ''}
          onValueChange={(value) => setValue('citySlug', value, { shouldValidate: true })}
        >
          <SelectTrigger id="citySlug" className="h-11 w-full">
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            {data.cities.map((city) => (
              <SelectItem key={city.slug} value={city.slug}>
                {city.name} ({city.countryCode})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="postalCode" label={t('postalCode')} error={errors.postalCode?.message}>
          <Input id="postalCode" className="h-11" {...register('postalCode')} />
        </Field>
        <Field id="addressLine" label={t('address')} error={errors.addressLine?.message}>
          <Input id="addressLine" className="h-11" {...register('addressLine')} />
        </Field>
      </div>

      <label className="hover:bg-muted flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors">
        <input type="checkbox" className="accent-primary size-4 shrink-0" {...register('hideExactAddress')} />
        <span>{t('hideAddress')}</span>
      </label>
    </div>
  );
}

export function StepDescription({ form, data }: StepProps) {
  const t = useTranslations('listing.fields');
  // Der Textgenerator bekommt Anzeigenamen, keine Kennungen: „Naftë“ statt
  // „DIESEL“, „Kamera prapa“ statt „rear-camera“.
  const tv = useTranslations('vehicles');
  const { register, watch, setValue, getValues, formState: { errors } } = form;
  const length = (watch('description') ?? '').length;

  const featureLabels = new Map(data.features.map((entry) => [entry.slug, entry.label]));

  return (
    <Field
      id="description" label={t('description')} hint={t('descriptionHint')}
      error={errors.description?.message}
    >
      <textarea
        id="description"
        rows={10}
        className="border-input bg-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
        {...register('description')}
      />
      <p className="text-muted-foreground mt-1 text-end text-xs">{length} / 6000</p>

      <DescribeButton
        // Die Werte werden erst beim Klick gelesen: `watch` auf dem ganzen
        // Formular würde bei jedem Tastendruck neu rendern.
        draft={() => {
          const values = getValues();

          // Die Formularwerte sind vor der Zod-Prüfung noch Rohwerte aus den
          // Eingabefeldern; Zahlen kommen dort als Zeichenkette an.
          const num = (value: unknown): number | undefined => {
            const parsed = Number(value);
            return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
          };
          const text = (value: unknown): string | undefined =>
            typeof value === 'string' && value.trim() !== '' ? value : undefined;

          return {
            brandSlug: values.brandSlug,
            modelSlug: values.modelSlug,
            variant: text(values.variant),
            registrationYear: num(values.registrationYear),
            mileageKm: num(values.mileageKm),
            fuel: values.fuel ? tv(`fuel.${values.fuel}`) : undefined,
            transmission: values.transmission
              ? tv(`transmission.${values.transmission}`)
              : undefined,
            powerKw: num(values.powerKw),
            bodyType: values.bodyType ? tv(`body.${values.bodyType}`) : undefined,
            doors: num(values.doors),
            seats: num(values.seats),
            color: text(values.color),
            customsStatus: values.customsStatus,
            plateOrigin: values.plateOrigin,
            accidentFree: values.accidentFree,
            serviceHistory: values.serviceHistory,
            ownersCount: num(values.ownersCount),
            features: (values.features ?? []).map(
              (slug) => featureLabels.get(slug) ?? slug,
            ),
          };
        }}
        onText={(text) => setValue('description', text, { shouldValidate: true, shouldDirty: true })}
      />
    </Field>
  );
}
