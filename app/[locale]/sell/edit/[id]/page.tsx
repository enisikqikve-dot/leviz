import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { ListingWizard } from '@/features/listings/components/wizard';
import { loadWizardData } from '@/features/listings/data';
import { EDITABLE_INCLUDE, toFormValues } from '@/features/listings/form-values';
import { canManage, requireUser } from '@/lib/auth/guards';
import { prisma } from '@/lib/db';
import type { Locale } from '@/lib/i18n/routing';

type PageProps = { params: Promise<{ locale: string; id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'myListings' });
  return { title: t('edit'), robots: { index: false } };
}

export default async function EditListingPage({ params }: PageProps) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const user = await requireUser();

  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
    include: EDITABLE_INCLUDE,
  });

  if (!vehicle) notFound();
  if (!canManage(user, vehicle)) notFound();

  const t = await getTranslations('listing');
  const data = await loadWizardData(locale as Locale);

  // Der gespeicherte Datensatz zurück in die Form, die der Assistent erwartet
  // -- dieselbe Uebersetzung, die auch die API der App liefert.
  const defaults = toFormValues(vehicle);

  return (
    <div className="lv-container py-8 sm:py-12">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('title')}</h1>
        <p className="text-muted-foreground mt-2 text-sm">{vehicle.title}</p>
      </header>

      <ListingWizard data={data} defaultValues={defaults} vehicleId={vehicle.id} />
    </div>
  );
}
