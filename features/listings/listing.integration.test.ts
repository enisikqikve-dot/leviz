// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { prisma } from '@/lib/db';
import { buildVehicleSlug, generatePublicCode } from '@/features/vehicles/slug';

import { listingSchema } from './schemas';
import { VALID_LISTING } from './fixtures';

/**
 * Schreibt ein Inserat genauso, wie es die Server Action tut, und liest es
 * zurück. Damit fallen Abweichungen zwischen Formularschema und Datenmodell
 * sofort auf — genau die Fehlerklasse, die der Typprüfer nicht sieht.
 */
let createdId: string | null = null;
let hasData = false;

beforeAll(async () => {
  try {
    hasData = (await prisma.brand.count()) > 0;
  } catch {
    hasData = false;
  }
});

afterAll(async () => {
  if (createdId) await prisma.vehicle.delete({ where: { id: createdId } }).catch(() => {});
});

describe('Inserat in der Datenbank', () => {
  it('schreibt das Inserat und liest es unverändert zurück', async () => {
    if (!hasData) return;

    const data = listingSchema.parse(VALID_LISTING);

    const [model, city, country, seller, features] = await Promise.all([
      prisma.model.findFirstOrThrow({
        where: { slug: data.modelSlug, brand: { slug: data.brandSlug } },
        select: { id: true, name: true, brandId: true, brand: { select: { name: true } } },
      }),
      prisma.city.findFirstOrThrow({
        where: { slug: data.citySlug },
        select: { id: true, name: true, lat: true, lng: true, countryId: true },
      }),
      prisma.country.findUniqueOrThrow({
        where: { code: data.importedFromCode! },
        select: { id: true },
      }),
      prisma.user.findFirstOrThrow({
        where: { email: 'seller@leviz.dev' },
        select: { id: true },
      }),
      prisma.feature.findMany({
        where: { slug: { in: data.features } },
        select: { id: true },
      }),
    ]);

    const publicCode = generatePublicCode();

    const created = await prisma.vehicle.create({
      data: {
        slug: buildVehicleSlug({
          brand: model.brand.name, model: model.name, variant: data.variant,
          year: data.registrationYear, city: city.name, publicCode,
        }),
        publicCode,
        sellerId: seller.id,
        sellerType: 'PRIVATE',
        status: 'DRAFT',
        category: data.category,
        brandId: model.brandId,
        modelId: model.id,
        title: `${model.brand.name} ${model.name} ${data.variant}`,
        condition: data.condition,
        priceCents: data.priceEur * 100,
        negotiable: data.negotiable,
        firstRegistration: new Date(data.registrationYear, data.registrationMonth - 1, 1),
        mileageKm: data.mileageKm,
        fuel: data.fuel,
        transmission: data.transmission,
        powerKw: data.powerKw,
        bodyType: data.bodyType,
        driveType: data.driveType,
        doors: data.doors,
        seats: data.seats,
        color: data.color,
        interiorColor: data.interiorColor,
        emissionClass: data.emissionClass,
        customsStatus: data.customsStatus,
        plateOrigin: data.plateOrigin,
        importedFromId: country.id,
        steeringSide: data.steeringSide,
        accidentFree: data.accidentFree,
        serviceHistory: data.serviceHistory,
        description: data.description,
        countryId: city.countryId,
        cityId: city.id,
        postalCode: data.postalCode,
        hideExactAddress: data.hideExactAddress,
        lat: city.lat,
        lng: city.lng,
        images: {
          create: data.images.map((image, position) => ({
            url: image.url, position, isMain: position === 0,
          })),
        },
        features: { create: features.map((feature) => ({ featureId: feature.id })) },
      },
      select: { id: true },
    });

    createdId = created.id;

    const readBack = await prisma.vehicle.findUniqueOrThrow({
      where: { id: created.id },
      include: { images: true, features: true, importedFrom: { select: { code: true } } },
    });

    expect(readBack.title).toBe('Volkswagen Passat 2.0 TDI');
    expect(readBack.priceCents).toBe(1_250_000);
    expect(readBack.mileageKm).toBe(168_000);
    expect(readBack.customsStatus).toBe('CLEARED');
    expect(readBack.plateOrigin).toBe('RKS');
    expect(readBack.importedFrom?.code).toBe('DE');
    expect(readBack.images).toHaveLength(2);
    expect(readBack.images.filter((image) => image.isMain)).toHaveLength(1);
    expect(readBack.features).toHaveLength(3);
    expect(readBack.slug).toContain('volkswagen-passat-2-0-tdi-2017-prishtine');
    // Ein neues Inserat ist zunächst ein Entwurf und noch nicht öffentlich.
    expect(readBack.status).toBe('DRAFT');
  });
});
