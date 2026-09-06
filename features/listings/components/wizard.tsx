'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight, Loader2, Rocket } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { publishListingAction, saveListingAction } from '@/features/listings/actions';
import { QualityMeter } from '@/features/listings/components/quality-meter';
import type { WizardData } from '@/features/listings/components/types';
import { WizardBody } from '@/features/listings/components/wizard-body';
import { STEP_FIELDS } from '@/features/listings/components/wizard-steps';
import { WizardSuccess } from '@/features/listings/components/wizard-success';
import {
  listingSchema, STEPS, type ListingFormValues, type ListingInput, type StepId,
} from '@/features/listings/schemas';
import { calculateQualityScore } from '@/features/vehicles/quality-score';
import { useRouter } from '@/lib/i18n/navigation';
import { cn } from '@/lib/utils';

const EMPTY: Partial<ListingFormValues> = {
  category: 'CAR', brandSlug: '', modelSlug: '', variant: '',
  registrationMonth: 1, condition: 'USED', accidentFree: true, serviceHistory: false,
  customsStatus: 'CLEARED', plateOrigin: 'RKS', steeringSide: 'LEFT',
  features: [], images: [], negotiable: false, vatDeductible: false,
  financingAvailable: false, leasingAvailable: false, hideExactAddress: true,
  description: '',
};

export function ListingWizard({
  data,
  defaultValues,
  vehicleId,
}: {
  data: WizardData;
  defaultValues?: Partial<ListingFormValues>;
  vehicleId?: string;
}) {
  const t = useTranslations('listing');
  const router = useRouter();

  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<{ slug: string; pending: boolean } | null>(null);

  // Drei Typparameter: was im Formular steht, der Kontext, und was nach der
  // Prüfung herauskommt. Ohne diese Trennung beisst sich der Resolver mit den
  // Standardwerten des Schemas.
  const form = useForm<ListingFormValues, unknown, ListingInput>({
    resolver: zodResolver(listingSchema),
    defaultValues: { ...EMPTY, ...defaultValues } as ListingFormValues,
    mode: 'onTouched',
  });

  // useWatch abonniert die Werte reaktiv; form.watch() kann nicht gemerkt
  // werden und würde die Neuberechnung des Qualitätswerts unbrauchbar machen.
  const values = useWatch({ control: form.control });
  const step = STEPS[stepIndex] as StepId;

  // Der Wert wird bei jeder Eingabe neu berechnet, damit der Verkäufer sofort
  // sieht, was ein zusätzliches Foto oder Feld bringt.
  const quality = useMemo(
    () =>
      calculateQualityScore({
        photoCount: values.images?.length ?? 0,
        descriptionLength: values.description?.length ?? 0,
        featureCount: values.features?.length ?? 0,
        hasMileage: Boolean(values.mileageKm),
        hasFirstRegistration: Boolean(values.registrationYear),
        hasFuel: Boolean(values.fuel),
        hasTransmission: Boolean(values.transmission),
        hasPower: Boolean(values.powerKw),
        hasBodyType: Boolean(values.bodyType),
        hasDriveType: Boolean(values.driveType),
        hasColor: Boolean(values.color),
        hasCustomsStatus: values.customsStatus !== 'NOT_APPLICABLE',
        hasServiceHistory: Boolean(values.serviceHistory),
        hasAccidentInfo: true,
        hasVin: Boolean(values.vin),
        sellerVerified: false,
      }),
    [values],
  );

  async function next() {
    // Nur die Felder des aktuellen Schritts prüfen.
    const valid = await form.trigger(STEP_FIELDS[step]);
    if (!valid) return;
    setStepIndex((current) => Math.min(current + 1, STEPS.length - 1));
  }

  async function publish() {
    setSaving(true);

    const saved = await saveListingAction(form.getValues(), vehicleId);
    if (!saved.ok) {
      setSaving(false);
      toast.error(saved.error);
      return;
    }

    const published = await publishListingAction(saved.data.id);
    setSaving(false);

    if (!published.ok) {
      toast.error(published.error);
      return;
    }

    setDone({
      slug: published.data.slug,
      pending: published.data.status === 'PENDING_REVIEW',
    });
    router.refresh();
  }

  if (done) return <WizardSuccess slug={done.slug} pending={done.pending} />;

  const isLast = stepIndex === STEPS.length - 1;

  return (
    <div className="lg:grid lg:grid-cols-[1fr_18rem] lg:items-start lg:gap-8">
      <div className="min-w-0">
        {/*
          Jeder Schritt ist jederzeit anspringbar.

          Vorher waren spätere gesperrt: man musste sich der Reihe nach
          durcharbeiten. Das passt nicht dazu, wie jemand ein Inserat
          tatsächlich anlegt — die Fotos hat er auf dem Telefon und will sie
          zuerst hochladen, den Preis kennt er sofort, den Kilometerstand muss
          er erst am Auto nachsehen.

          Verloren geht dabei nichts: „Weiter" prüft weiterhin den aktuellen
          Schritt, und vor dem Veröffentlichen prüft der Server das gesamte
          Formular. Wer etwas überspringt, kommt also nicht mit einem
          unvollständigen Inserat durch — er sieht rechts im Gütepunktestand,
          was noch fehlt.
        */}
        <ol className="flex flex-wrap gap-1.5" aria-label={t('title')}>
          {STEPS.map((id, index) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => setStepIndex(index)}
                aria-current={index === stepIndex ? 'step' : undefined}
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                  index === stepIndex
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {t(`steps.${id}`)}
              </button>
            </li>
          ))}
        </ol>

        <p className="text-muted-foreground mt-4 text-sm">
          {t('stepOf', { current: stepIndex + 1, total: STEPS.length })}
        </p>

        <div className="bg-card mt-4 rounded-xl border p-5 sm:p-6">
          <h2 className="mb-5 text-lg font-semibold">{t(`steps.${step}`)}</h2>
          <WizardBody step={step} form={form} data={data} />
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <Button
            type="button" variant="outline" size="lg" className="h-11"
            onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
            disabled={stepIndex === 0 || saving}
          >
            <ArrowLeft className="size-4" aria-hidden />
            {t('nav.back')}
          </Button>

          {isLast ? (
            <Button type="button" size="lg" className="h-11" onClick={publish} disabled={saving}>
              {saving
                ? <Loader2 className="size-4 animate-spin" aria-hidden />
                : <Rocket className="size-4" aria-hidden />}
              {t('nav.publish')}
            </Button>
          ) : (
            <Button type="button" size="lg" className="h-11" onClick={next} disabled={saving}>
              {t('nav.next')}
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          )}
        </div>
      </div>

      <aside className="mt-8 lg:sticky lg:top-20 lg:mt-0">
        <QualityMeter quality={quality} />
      </aside>
    </div>
  );
}
