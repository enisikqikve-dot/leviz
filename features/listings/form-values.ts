import { variantFromTitle } from '@/features/vehicles/format';
import type { Prisma } from '@/lib/generated/prisma/client';

import type { ListingFormValues } from './schemas';

/**
 * Ein gespeichertes Inserat zurueck in die Form, die der Assistent erwartet.
 *
 * Genutzt von der Bearbeiten-Seite der Website und von der API fuer die App:
 * beide zeigen dieselben Felder mit denselben Werten vorbelegt. Was hier
 * fehlt, fehlt an beiden Stellen -- und was hier stimmt, stimmt an beiden.
 */

/** Was die Rueckuebersetzung vom Datensatz braucht. */
export const EDITABLE_INCLUDE = {
  brand: { select: { slug: true, name: true } },
  model: { select: { slug: true, name: true } },
  city: { select: { slug: true } },
  importedFrom: { select: { code: true } },
  images: { orderBy: { position: 'asc' }, select: { url: true } },
  features: { select: { feature: { select: { slug: true } } } },
} satisfies Prisma.VehicleInclude;

export type EditableVehicle = Prisma.VehicleGetPayload<{ include: typeof EDITABLE_INCLUDE }>;

export function toFormValues(vehicle: EditableVehicle): Partial<ListingFormValues> {
  return {
    category: vehicle.category,
    brandSlug: vehicle.brand.slug,
    modelSlug: vehicle.model.slug,
    // Der Titel ist "Marke Modell Variante"; derselbe Schnitt wie auf den
    // Karten. Der fruehere Regex auf den Modell-Slug traf bei Modellen mit
    // Leerzeichen ("3 Series" gegen "3-series") nie und liess den ganzen
    // Titel als Variante stehen.
    variant: variantFromTitle(vehicle.title, vehicle.brand.name, vehicle.model.name) ?? undefined,
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
}
