'use client';

import { useTranslations } from 'next-intl';

import { StepCondition } from '@/features/listings/components/step-condition';
import {
  StepDescription, StepFeatures, StepImages, StepLocation, StepPrice,
} from '@/features/listings/components/step-rest';
import { StepTechnical } from '@/features/listings/components/step-technical';
import { StepVehicle } from '@/features/listings/components/step-vehicle';
import type { StepProps } from '@/features/listings/components/types';
import type { StepId } from '@/features/listings/schemas';

/** Wählt den Inhalt des aktuellen Schritts. */
export function WizardBody({ step, form, data }: StepProps & { step: StepId }) {
  const t = useTranslations('listing');

  switch (step) {
    case 'vehicle':
      return <StepVehicle form={form} data={data} />;
    case 'technical':
      return <StepTechnical form={form} data={data} />;
    case 'condition':
      return <StepCondition form={form} data={data} />;
    case 'features':
      return <StepFeatures form={form} data={data} />;
    case 'images':
      return <StepImages form={form} data={data} />;
    case 'price':
      return <StepPrice form={form} data={data} />;
    case 'location':
      return <StepLocation form={form} data={data} />;
    case 'description':
      return <StepDescription form={form} data={data} />;
    case 'preview':
    default:
      return <p className="text-muted-foreground text-sm">{t('preview.title')}</p>;
  }
}
