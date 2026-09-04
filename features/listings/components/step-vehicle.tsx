'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Field } from '@/features/auth/components/field';
import type { StepProps } from '@/features/listings/components/types';

export function StepVehicle({ form, data }: StepProps) {
  const t = useTranslations('listing.fields');
  const { register, watch, setValue, formState: { errors } } = form;

  const brandSlug = watch('brandSlug');

  // Marke und Modelle liegen in einem Zustand, damit sich der Ladezustand
  // ableiten lässt statt im Effekt gesetzt zu werden — ein synchrones
  // setState im Effekt löst eine zusätzliche Renderrunde aus.
  const [loaded, setLoaded] = useState<{
    brand: string;
    models: { slug: string; name: string }[];
  }>({ brand: '', models: [] });

  const models = loaded.brand === brandSlug ? loaded.models : [];
  const loading = Boolean(brandSlug) && loaded.brand !== brandSlug;

  // Die Modelle folgen der Marke. Alle 181 Modelle vorab zu laden wäre
  // Verschwendung, darum werden sie erst bei Bedarf nachgeholt.
  useEffect(() => {
    if (!brandSlug) return;

    const controller = new AbortController();

    fetch(`/api/models?brand=${encodeURIComponent(brandSlug)}`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : []))
      .then((rows: { slug: string; name: string }[]) => {
        setLoaded({ brand: brandSlug, models: rows });
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoaded({ brand: brandSlug, models: [] });
      });

    return () => controller.abort();
  }, [brandSlug]);

  return (
    <div className="space-y-5">
      <Field id="brand" label={t('brand')} error={errors.brandSlug?.message}>
        <Select
          value={brandSlug ?? ''}
          onValueChange={(value) => {
            setValue('brandSlug', value, { shouldValidate: true });
            // Ein Modell der alten Marke wäre nach dem Wechsel falsch.
            setValue('modelSlug', '');
          }}
        >
          <SelectTrigger id="brand" className="h-11 w-full">
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            {data.brands.map((brand) => (
              <SelectItem key={brand.slug} value={brand.slug}>{brand.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field id="model" label={t('model')} error={errors.modelSlug?.message}>
        <Select
          value={watch('modelSlug') ?? ''}
          onValueChange={(value) => setValue('modelSlug', value, { shouldValidate: true })}
          disabled={!brandSlug || loading || models.length === 0}
        >
          <SelectTrigger id="model" className="h-11 w-full">
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            {models.map((model) => (
              <SelectItem key={model.slug} value={model.slug}>{model.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field
        id="variant" label={t('variant')} hint={t('variantHint')}
        error={errors.variant?.message}
      >
        <Input id="variant" className="h-11" {...register('variant')} />
      </Field>
    </div>
  );
}
