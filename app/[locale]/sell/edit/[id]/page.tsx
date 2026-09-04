import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { ListingWizard } from '@/features/listings/components/wizard';
import type { ListingFormValues } from '@/features/listings/schemas';
import { loadWizardData } from '@/features/listings/data';
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
    include: {
      brand: { select: { slug: true } },
      model: { select: { slug: true } },
      city: { select: { slug: true } },
      importedFrom: { select: { code: true } },
      images: { orderBy: { position: 'asc' }, select: { url: true } },
      features: { select: { feature: { select: { slug: true } } } },
    },
  });

  if (!vehicle) notFound();
  if (!canManage(user, vehicle)) notFound();

  const t = await getTranslations('listing');
  const data = await loadWizardData(locale as Locale);

  // Der gespeicherte Datensatz zurück in die Form, die der Assistent erwartet.
  const defaults: Partial<ListingFormValues> = {
    category: vehicle.category,
    brandSlug: vehicle.brand.slug,
    modelSlug: vehicle.model.slug,
    variant: vehicle.title
      .replace(new RegExp(`^.*?${vehicle.model.slug}\s*`, 'i'), '')
      .trim() || undefined,
    registrationYear: vehicle.firstRegistration?.getFullYear(),
    registrationMonth: (vehicle.firstRegistration?.getMonth() ?? 0) + 1,
    mileageKm: vehicle.mileageKm ?? undefined,
    fuel: vehicle.fuel ?? undefined,
    transmission: vehicle.transmission ?? undefined,
    powerKw: vehicle.powerKw ?? undefined,
    bodyType: vehicle.bodyType ?? undefined,
    driveType: vehicle.driveType ?? undefined,
    doors: vehicle.doors ?? undefined,
    seats: vehicle.seats ?? undefined,
    displacementCcm: vehicle.displacementCcm ?? undefined,
    color: (vehicle.color as ListingFormValues['color']) ?? undefined,
    interiorColor: (vehicle.interiorColor as ListingFormValues['interiorColor']) ?? undefined,
    emissionClass: vehicle.emissionClass ?? undefined,
    condition: vehicle.condition,
    accidentFree: vehicle.accidentFree ?? true,
    serviceHistory: vehicle.serviceHistory ?? false,
    warrantyMonths: vehicle.warrantyMonths ?? undefined,
    ownersCount: vehicle.ownersCount ?? undefined,
    vin: vehicle.vin ?? '',
    customsStatus: vehicle.customsStatus,
    plateOrigin: vehicle.plateOrigin,
    importedFromCode: vehicle.importedFrom?.code ?? '',
    registeredUntil: vehicle.registeredUntil?.toISOString().slice(0, 10) ?? '',
    steeringSide: vehicle.steeringSide,
    features: vehicle.features.map((entry) => entry.feature.slug),
    images: vehicle.images.map((image) => ({
      // Beispieldaten liegen extern; für sie gibt es keinen Speicherschlüssel.
      key: image.url.startsWith('/uploads/') ? image.url.replace('/uploads/', '') : image.url,
      url: image.url,
    })),
    priceEur: Math.round(vehicle.priceCents / 100),
    negotiable: vehicle.negotiable,
    vatDeductible: vehicle.vatDeductible,
    financingAvailable: vehicle.financingAvailable,
    leasingAvailable: vehicle.leasingAvailable,
    citySlug: vehicle.city?.slug ?? '',
    postalCode: vehicle.postalCode ?? '',
    addressLine: vehicle.addressLine ?? '',
    hideExactAddress: vehicle.hideExactAddress,
    description: vehicle.description ?? '',
  };

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
