'use server';

import { revalidatePath } from 'next/cache';

import { fail, fromZod, ok, type ActionResult } from '@/lib/action-result';
import { canManage, requireUser } from '@/lib/auth/guards';
import { canPublishMore } from '@/features/packages/entitlements';
import { getLimits } from '@/features/packages/queries';
import { prisma } from '@/lib/db';
import type { VehicleStatus } from '@/lib/generated/prisma/enums';
import { buildVehicleSlug, generatePublicCode } from '@/features/vehicles/slug';
import { buildVehicleTitle } from '@/features/vehicles/format';
import { calculateQualityScore } from '@/features/vehicles/quality-score';
import { refreshRankScores } from '@/features/vehicles/rank';

import { assessListing } from './moderation';
import { listingSchema, type ListingInput } from './schemas';

/** Untergrenze für die automatische Prüfung, im Verwaltungsbereich änderbar. */
async function priceFloorCents(): Promise<number> {
  const setting = await prisma.platformSetting.findUnique({
    where: { key: 'moderation.suspiciousPriceFloorCents' },
    select: { value: true },
  });
  return typeof setting?.value === 'number' ? setting.value : 50_000;
}

type SaveResult = { id: string; slug: string; needsReview: boolean };

/** Baut die Fahrzeugfelder aus den geprüften Eingaben des Assistenten. */
function toVehicleFields(
  data: ListingInput,
  context: {
    title: string;
    brandId: string;
    modelId: string;
    cityId: string;
    countryId: string;
    lat: number;
    lng: number;
    importedFromId: string | null;
    qualityScore: number;
    flaggedReason: string | null;
  },
) {
  return {
    category: data.category,
    brandId: context.brandId,
    modelId: context.modelId,
    title: context.title,
    condition: data.condition,
    priceCents: data.priceEur * 100,
    negotiable: data.negotiable,
    vatDeductible: data.vatDeductible,
    financingAvailable: data.financingAvailable,
    leasingAvailable: data.leasingAvailable,
    firstRegistration: new Date(data.registrationYear, data.registrationMonth - 1, 1),
    mileageKm: data.mileageKm,
    fuel: data.fuel,
    transmission: data.transmission,
    powerKw: data.powerKw,
    bodyType: data.bodyType,
    driveType: data.driveType ?? null,
    doors: data.doors ?? null,
    seats: data.seats ?? null,
    displacementCcm: data.displacementCcm ?? null,
    color: data.color ?? null,
    interiorColor: data.interiorColor ?? null,
    emissionClass: data.emissionClass ?? null,
    co2Gkm: data.co2Gkm ?? null,
    consumptionCombined: data.consumptionCombined ?? null,
    electricRangeKm: data.electricRangeKm ?? null,
    batteryCapacityKwh: data.batteryCapacityKwh ?? null,
    customsStatus: data.customsStatus,
    plateOrigin: data.plateOrigin,
    importedFromId: context.importedFromId,
    registeredUntil: data.registeredUntil ? new Date(data.registeredUntil) : null,
    steeringSide: data.steeringSide,
    accidentFree: data.accidentFree,
    serviceHistory: data.serviceHistory,
    warrantyMonths: data.warrantyMonths ?? null,
    ownersCount: data.ownersCount ?? null,
    vin: data.vin || null,
    description: data.description,
    countryId: context.countryId,
    cityId: context.cityId,
    postalCode: data.postalCode || null,
    addressLine: data.addressLine || null,
    hideExactAddress: data.hideExactAddress,
    lat: context.lat,
    lng: context.lng,
    qualityScore: context.qualityScore,
    flaggedReason: context.flaggedReason,
  };
}

/**
 * Legt ein Inserat an oder aktualisiert es.
 *
 * Der gesamte Datensatz wird serverseitig erneut geprüft — die Schrittführung
 * im Browser ist Bequemlichkeit, kein Schutz.
 */
export async function saveListingAction(
  input: unknown,
  vehicleId?: string,
): Promise<ActionResult<SaveResult>> {
  const user = await requireUser();

  const parsed = listingSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error.issues);

  const data = parsed.data;

  // Die Bildgrenze des Pakets wird hier durchgesetzt. Der Assistent begrenzt
  // die Auswahl bereits, aber das ist Bequemlichkeit und kein Schutz.
  const limits = await getLimits(user.id);
  if (data.images.length > limits.photoLimit) {
    return fail(`Pakoja jote lejon më së shumti ${limits.photoLimit} foto`);
  }

  const [model, city, importedFrom, existing, account] = await Promise.all([
    prisma.model.findFirst({
      where: { slug: data.modelSlug, brand: { slug: data.brandSlug } },
      select: { id: true, name: true, brandId: true, brand: { select: { name: true } } },
    }),
    prisma.city.findFirst({
      where: { slug: data.citySlug },
      select: { id: true, name: true, lat: true, lng: true, countryId: true },
    }),
    data.importedFromCode
      ? prisma.country.findUnique({
          where: { code: data.importedFromCode.toUpperCase() },
          select: { id: true },
        })
      : Promise.resolve(null),
    vehicleId
      ? prisma.vehicle.findUnique({
          where: { id: vehicleId },
          select: {
            id: true, slug: true, sellerId: true, dealerId: true,
            priceCents: true, status: true,
          },
        })
      : Promise.resolve(null),
    prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { createdAt: true, dealer: { select: { id: true, verification: true } } },
    }),
  ]);

  if (!model) return fail('Marka ose modeli nuk u gjet');
  if (!city) return fail('Qyteti nuk u gjet');

  if (vehicleId) {
    if (!existing) return fail('Kjo shpallje nuk u gjet');
    if (!canManage(user, existing)) return fail('Nuk keni qasje në këtë shpallje');
  }

  const dealerVerified = account.dealer?.verification === 'VERIFIED';
  const priceCents = data.priceEur * 100;

  const quality = calculateQualityScore({
    photoCount: data.images.length,
    descriptionLength: data.description.length,
    featureCount: data.features.length,
    hasMileage: true, hasFirstRegistration: true, hasFuel: true,
    hasTransmission: true, hasPower: true, hasBodyType: true,
    hasDriveType: Boolean(data.driveType), hasColor: Boolean(data.color),
    hasCustomsStatus: data.customsStatus !== 'NOT_APPLICABLE',
    hasServiceHistory: data.serviceHistory,
    hasAccidentInfo: true,
    hasVin: Boolean(data.vin),
    sellerVerified: dealerVerified,
  });

  const review = assessListing({
    priceCents,
    photoCount: data.images.length,
    description: data.description,
    accountAgeHours: (Date.now() - account.createdAt.getTime()) / 3_600_000,
    priceFloorCents: await priceFloorCents(),
    sellerVerified: dealerVerified,
  });

  const featureRows = await prisma.feature.findMany({
    where: { slug: { in: data.features } },
    select: { id: true },
  });

  const title = buildVehicleTitle(model.brand.name, model.name, data.variant);

  const fields = toVehicleFields(data, {
    title,
    brandId: model.brandId,
    modelId: model.id,
    cityId: city.id,
    countryId: city.countryId,
    lat: city.lat,
    lng: city.lng,
    importedFromId: importedFrom?.id ?? null,
    qualityScore: quality.score,
    flaggedReason: review.signals.length > 0 ? review.signals.join(',') : null,
  });

  const images = data.images.map((image, position) => ({
    url: image.url,
    position,
    isMain: position === 0,
    altText: title,
  }));
  const features = featureRows.map((feature) => ({ featureId: feature.id }));

  let saved: { id: string; slug: string };

  if (existing) {
    // Bilder und Ausstattung werden ersetzt, damit Entfernungen auch wirken.
    await prisma.$transaction([
      prisma.vehicleImage.deleteMany({ where: { vehicleId: existing.id } }),
      prisma.vehicleFeature.deleteMany({ where: { vehicleId: existing.id } }),
      prisma.vehicle.update({
        where: { id: existing.id },
        data: { ...fields, images: { create: images }, features: { create: features } },
      }),
    ]);

    // Preisänderungen werden festgehalten; daran hängt die Benachrichtigung
    // "Preis gesenkt" für Merklisten.
    if (existing.priceCents !== priceCents) {
      await prisma.$transaction([
        prisma.priceHistory.create({ data: { vehicleId: existing.id, priceCents } }),
        prisma.vehicle.update({
          where: { id: existing.id },
          data: { previousPriceCents: existing.priceCents },
        }),
      ]);
    }

    saved = { id: existing.id, slug: existing.slug };
  } else {
    const publicCode = generatePublicCode();
    const slug = buildVehicleSlug({
      brand: model.brand.name,
      model: model.name,
      variant: data.variant,
      year: data.registrationYear,
      city: city.name,
      publicCode,
    });

    saved = await prisma.vehicle.create({
      data: {
        ...fields,
        slug,
        publicCode,
        sellerId: user.id,
        dealerId: account.dealer?.id ?? null,
        sellerType: account.dealer ? 'DEALER' : 'PRIVATE',
        status: 'DRAFT',
        images: { create: images },
        features: { create: features },
        priceHistory: { create: { priceCents } },
      },
      select: { id: true, slug: true },
    });
  }

  await refreshRankScores([saved.id]);
  revalidatePath('/dashboard/listings');

  return ok({ ...saved, needsReview: review.needsReview });
}

type OwnedVehicle = {
  id: string;
  slug: string;
  sellerId: string;
  dealerId: string | null;
  status: VehicleStatus;
  flaggedReason: string | null;
  expiresAt: Date | null;
};

/**
 * Lädt ein Inserat und stellt sicher, dass der Aufrufer es verwalten darf.
 * Der Rückgabetyp ist über das Feld `ok` eindeutig unterscheidbar, damit die
 * Aufrufer sauber verengen können.
 */
async function loadOwned(
  vehicleId: string,
): Promise<{ ok: false; error: string } | { ok: true; vehicle: OwnedVehicle }> {
  const user = await requireUser();

  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    select: {
      id: true, slug: true, sellerId: true, dealerId: true, status: true,
      flaggedReason: true, expiresAt: true,
    },
  });

  if (!vehicle) return { ok: false, error: 'Kjo shpallje nuk u gjet' };
  if (!canManage(user, vehicle)) {
    return { ok: false, error: 'Nuk keni qasje në këtë shpallje' };
  }

  return { ok: true, vehicle };
}

/**
 * Schaltet ein Inserat live.
 *
 * Der Normalfall ist sofort sichtbar. Nur Inserate, bei denen die automatische
 * Prüfung angeschlagen hat, warten auf eine Freigabe — so bleibt der Weg für
 * ehrliche Verkäufer kurz, ohne die Plattform ungeschützt zu lassen.
 */
export async function publishListingAction(
  vehicleId: string,
): Promise<ActionResult<{ status: 'ACTIVE' | 'PENDING_REVIEW'; slug: string }>> {
  const loaded = await loadOwned(vehicleId);
  if (!loaded.ok) return fail(loaded.error);

  const { vehicle } = loaded;

  // Die Paketgrenze gilt beim Schalten, nicht beim Speichern: einen Entwurf
  // darf jeder anlegen, sichtbar werden nur so viele, wie das Paket zulaesst.
  const [limits, published] = await Promise.all([
    getLimits(vehicle.sellerId),
    prisma.vehicle.count({
      where: {
        sellerId: vehicle.sellerId,
        status: { in: ['ACTIVE', 'PENDING_REVIEW', 'PAUSED'] },
        id: { not: vehicle.id },
      },
    }),
  ]);

  if (!canPublishMore(limits, published)) {
    return fail('Ke arritur kufirin e shpalljeve të pakos sate');
  }

  const needsReview = Boolean(vehicle.flaggedReason);
  const status = needsReview ? 'PENDING_REVIEW' : 'ACTIVE';

  // Die Laufzeit kommt aus dem Paket; die Plattformeinstellung ist der
  // Rueckfallwert, falls ein Paket dort nichts festlegt.
  const duration = await prisma.platformSetting.findUnique({
    where: { key: 'listing.defaultDurationDays' },
    select: { value: true },
  });
  const days =
    limits.listingDurationDays ||
    (typeof duration?.value === 'number' ? duration.value : 60);

  await prisma.vehicle.update({
    where: { id: vehicle.id },
    data: {
      status,
      publishedAt: new Date(),
      expiresAt: new Date(Date.now() + days * 86_400_000),
      soldAt: null,
    },
  });

  revalidatePath('/dashboard/listings');
  return ok({ status, slug: vehicle.slug });
}

/** Pausiert ein Inserat oder schaltet es wieder frei. */
export async function toggleListingPauseAction(
  vehicleId: string,
): Promise<ActionResult<{ status: 'ACTIVE' | 'PAUSED' }>> {
  const loaded = await loadOwned(vehicleId);
  if (!loaded.ok) return fail(loaded.error);

  const { vehicle } = loaded;

  if (vehicle.status !== 'ACTIVE' && vehicle.status !== 'PAUSED') {
    return fail('Kjo shpallje nuk mund të ndryshohet në këtë gjendje');
  }

  const status = vehicle.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';

  await prisma.vehicle.update({ where: { id: vehicle.id }, data: { status } });

  revalidatePath('/dashboard/listings');
  return ok({ status });
}

/** Markiert ein Fahrzeug als verkauft. Es bleibt erhalten, aber unsichtbar. */
export async function markListingSoldAction(vehicleId: string): Promise<ActionResult> {
  const loaded = await loadOwned(vehicleId);
  if (!loaded.ok) return fail(loaded.error);

  await prisma.vehicle.update({
    where: { id: loaded.vehicle.id },
    data: { status: 'SOLD', soldAt: new Date() },
  });

  revalidatePath('/dashboard/listings');
  return ok();
}

/**
 * Löscht ein Inserat endgültig, samt hochgeladener Bilder.
 *
 * Die Dateien werden erst nach dem Datenbankeintrag entfernt: bricht das
 * Löschen im Speicher ab, bleiben höchstens verwaiste Dateien zurück — nie
 * ein Inserat ohne Bilder.
 */
export async function deleteListingAction(vehicleId: string): Promise<ActionResult> {
  const loaded = await loadOwned(vehicleId);
  if (!loaded.ok) return fail(loaded.error);

  const images = await prisma.vehicleImage.findMany({
    where: { vehicleId: loaded.vehicle.id },
    select: { url: true },
  });

  await prisma.vehicle.delete({ where: { id: loaded.vehicle.id } });

  const { getStorage } = await import('@/lib/storage');
  const storage = getStorage();

  for (const image of images) {
    // Nur selbst hochgeladene Dateien; Beispieldaten liegen extern.
    if (image.url.startsWith('/uploads/')) {
      await storage.remove(image.url.replace('/uploads/', ''));
    }
  }

  revalidatePath('/dashboard/listings');
  return ok();
}
