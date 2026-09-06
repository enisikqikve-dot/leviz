'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, TrendingUp } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Field } from '@/features/auth/components/field';
import { estimateForCarAction, type ValuationResult } from '@/features/pricing/actions';
import {
  valuationSchema, type ValuationFormInput, type ValuationInput,
} from '@/features/pricing/schemas';
import { formatPrice, type Currency } from '@/lib/currency';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';

type Brand = { slug: string; name: string };
type Model = { slug: string; name: string };

export function ValuationForm({
  brands,
  locale,
  currency,
  eurToAll,
}: {
  brands: Brand[];
  locale: Locale;
  currency: Currency;
  eurToAll: number;
}) {
  const t = useTranslations('valuation');

  const [models, setModels] = useState<{ brand: string; rows: Model[] }>({
    brand: '',
    rows: [],
  });
  const [ergebnis, setErgebnis] = useState<ValuationResult | null>(null);
  const [hinweis, setHinweis] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ValuationFormInput, unknown, ValuationInput>({
    resolver: zodResolver(valuationSchema),
    defaultValues: { brandSlug: '', modelSlug: '', year: '', mileageKm: '' },
  });

  // useWatch statt form.watch: letzteres abonniert bei jedem Rendern neu.
  const brandSlug = useWatch({ control, name: 'brandSlug' });
  const modelSlug = useWatch({ control, name: 'modelSlug' });

  const geladen = models.brand === brandSlug;
  const laedt = Boolean(brandSlug) && !geladen;

  useEffect(() => {
    if (!brandSlug) return;

    const controller = new AbortController();

    fetch(`/api/models?brand=${encodeURIComponent(brandSlug)}`, { signal: controller.signal })
      .then((antwort) => antwort.json())
      .then((rows: Model[]) => setModels({ brand: brandSlug, rows }))
      .catch(() => {
        if (!controller.signal.aborted) setModels({ brand: brandSlug, rows: [] });
      });

    return () => controller.abort();
  }, [brandSlug]);

  const preis = (cents: number) => formatPrice(cents, { currency, locale, eurToAll });

  /**
   * Die Schemata melden Schluessel, keine Saetze — sonst stuende in einem
   * albanischen Formular eine deutsche Fehlermeldung. Uebersetzt wird erst
   * hier, wo die Sprache feststeht.
   */
  const meldung = (schluessel?: string) =>
    schluessel ? (t.has(schluessel) ? t(schluessel) : schluessel) : undefined;

  async function submit(values: ValuationInput) {
    setErgebnis(null);
    setHinweis(null);

    const result = await estimateForCarAction(values);

    if (!result.ok) {
      for (const [feld, meldungen] of Object.entries(result.fieldErrors ?? {})) {
        setError(feld as keyof ValuationFormInput, { message: meldungen[0] });
      }
      if (!result.fieldErrors) {
        setHinweis(t.has(result.error) ? t(result.error) : result.error);
      }
      return;
    }

    setErgebnis(result.data);
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit(submit)}
        className="bg-card text-card-foreground space-y-5 rounded-2xl border p-6 sm:p-8"
        noValidate
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="brand" label={t('brand')} error={meldung(errors.brandSlug?.message)}>
            <Select
              value={brandSlug || ''}
              onValueChange={(value) => {
                setValue('brandSlug', value, { shouldValidate: true });
                // Das alte Modell gehört nicht zur neuen Marke.
                setValue('modelSlug', '');
              }}
            >
              <SelectTrigger id="brand" className="h-11 w-full">
                <SelectValue placeholder={t('choose')} />
              </SelectTrigger>
              <SelectContent>
                {brands.map((brand) => (
                  <SelectItem key={brand.slug} value={brand.slug}>
                    {brand.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field id="model" label={t('model')} error={meldung(errors.modelSlug?.message)}>
            <Select
              value={modelSlug || ''}
              onValueChange={(value) => setValue('modelSlug', value, { shouldValidate: true })}
              disabled={!brandSlug || laedt || (geladen && models.rows.length === 0)}
            >
              <SelectTrigger id="model" className="h-11 w-full">
                <SelectValue placeholder={laedt ? t('loading') : t('choose')} />
              </SelectTrigger>
              <SelectContent>
                {(geladen ? models.rows : []).map((model) => (
                  <SelectItem key={model.slug} value={model.slug}>
                    {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="year" label={t('year')} error={meldung(errors.year?.message)}>
            <Input
              id="year"
              type="number"
              inputMode="numeric"
              placeholder="2016"
              className="h-11"
              {...register('year')}
            />
          </Field>

          <Field id="mileageKm" label={t('mileage')} error={meldung(errors.mileageKm?.message)}>
            <Input
              id="mileageKm"
              type="number"
              inputMode="numeric"
              placeholder="150000"
              className="h-11"
              {...register('mileageKm')}
            />
          </Field>
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {t('submit')}
        </Button>
      </form>

      {hinweis ? (
        <p className="bg-muted text-muted-foreground rounded-xl p-5 text-sm" role="status">
          {hinweis}
        </p>
      ) : null}

      {ergebnis ? (
        <div className="bg-card text-card-foreground rounded-2xl border p-6 sm:p-8" role="status">
          <p className="text-muted-foreground text-sm">
            {ergebnis.brandName} {ergebnis.modelName}
          </p>

          <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl">
            {preis(ergebnis.averageCents)}
          </p>

          {/* Die Spanne steht gleichberechtigt daneben, nicht im Kleingedruckten:
              eine einzelne Zahl liest sich wie ein Festpreis, und das ist sie nicht. */}
          <div className="bg-muted mt-5 flex items-center justify-between rounded-xl px-4 py-3 text-sm">
            <span className="font-medium tabular-nums">{preis(ergebnis.lowCents)}</span>
            <span className="text-muted-foreground text-xs">{t('range')}</span>
            <span className="font-medium tabular-nums">{preis(ergebnis.highCents)}</span>
          </div>

          <p className="text-muted-foreground mt-4 flex items-start gap-2 text-xs leading-relaxed">
            <TrendingUp className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              {t('basis', { count: ergebnis.sampleSize })}{' '}
              {ergebnis.scope === 'brand' ? t('basisBrand') : null} {t('disclaimer')}
            </span>
          </p>

          <Button asChild size="lg" className="mt-6 w-full">
            <Link href="/sell/create">{t('sellNow')}</Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
