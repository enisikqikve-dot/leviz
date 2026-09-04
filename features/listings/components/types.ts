import type { UseFormReturn } from 'react-hook-form';

import type { ListingFormValues } from '@/features/listings/schemas';

/** Auswahllisten, die der Server an den Assistenten übergibt. */
export type WizardData = {
  brands: { slug: string; name: string }[];
  cities: { slug: string; name: string; countryCode: string }[];
  importCountries: { code: string; name: string }[];
  features: { slug: string; label: string; group: string }[];
};

export type StepProps = {
  form: UseFormReturn<ListingFormValues>;
  data: WizardData;
};
