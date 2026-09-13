// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { Actor } from '@/lib/auth/permissions';
import { prisma } from '@/lib/db';

import {
  deleteListing, markListingSold, publishListing, saveListing, toggleListingPause,
} from './core';
import { EDITABLE_INCLUDE, toFormValues } from './form-values';
import { VALID_LISTING } from './fixtures';
import { loadOwnListings } from './mine';

/**
 * Der ganze Lebenslauf eines Inserats durch den Kern, den Website und App
 * teilen: anlegen, zum Bearbeiten zuruecklesen, veroeffentlichen, pausieren,
 * verkaufen, loeschen. Und ein Fremder, der an jedem Schritt abprallt.
 *
 * Der Test bringt seine Konten selbst mit; der Katalog (Marken, Staedte)
 * wird vorausgesetzt wie im Nachbartest.
 */
const SELLER_EMAIL = 'core-seller@leviz.invalid';
const STRANGER_EMAIL = 'core-stranger@leviz.invalid';

let hasData = false;
let seller: Actor | null = null;
let stranger: Actor | null = null;
let vehicleId: string | null = null;

beforeAll(async () => {
  try {
    hasData = (await prisma.brand.count()) > 0;
  } catch {
    hasData = false;
    return;
  }
  if (!hasData) return;

  const konten = await Promise.all(
    [SELLER_EMAIL, STRANGER_EMAIL].map((email) =>
      prisma.user.upsert({
        where: { email },
        update: {},
        create: { email, name: 'Kerntest', role: 'PRIVATE_SELLER' },
        select: { id: true },
      }),
    ),
  );

  seller = { id: konten[0].id, role: 'PRIVATE_SELLER', dealerId: null };
  stranger = { id: konten[1].id, role: 'PRIVATE_SELLER', dealerId: null };
});

afterAll(async () => {
  if (vehicleId) await prisma.vehicle.delete({ where: { id: vehicleId } }).catch(() => {});
  for (const email of [SELLER_EMAIL, STRANGER_EMAIL]) {
    await prisma.user.delete({ where: { email } }).catch(() => {});
  }
});

describe('Inserat durch den Kern', () => {
  it('legt an und liest fuer die Bearbeitung dieselben Werte zurueck', async () => {
    if (!hasData) return;

    const saved = await saveListing(seller!, VALID_LISTING);
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;

    vehicleId = saved.data.id;
    expect(saved.data.slug).toContain('volkswagen-passat');

    const vehicle = await prisma.vehicle.findUniqueOrThrow({
      where: { id: vehicleId },
      include: EDITABLE_INCLUDE,
    });
    const values = toFormValues(vehicle);

    // Die Variante kommt sauber aus dem Titel zurueck -- nicht der ganze Titel.
    expect(values.variant).toBe('2.0 TDI');
    expect(values.brandSlug).toBe('volkswagen');
    expect(values.modelSlug).toBe('passat');
    expect(values.registrationYear).toBe(2017);
    expect(values.registrationMonth).toBe(6);
    expect(values.priceEur).toBe(12_500);
    expect(values.importedFromCode).toBe('DE');
    expect(values.citySlug).toBe('prishtine');
    expect(values.images).toEqual(VALID_LISTING.images);
    expect(values.features).toEqual(expect.arrayContaining([...VALID_LISTING.features]));
    expect(values.features).toHaveLength(VALID_LISTING.features.length);
  });

  it('steht in "Meine Inserate" des Verkaeufers, nicht in denen eines Fremden', async () => {
    if (!hasData || !vehicleId) return;

    const eigene = await loadOwnListings(seller!);
    expect(eigene.map((v) => v.id)).toContain(vehicleId);
    expect(eigene.find((v) => v.id === vehicleId)?.status).toBe('DRAFT');

    const fremde = await loadOwnListings(stranger!);
    expect(fremde.map((v) => v.id)).not.toContain(vehicleId);
  });

  it('laesst einen Fremden an keinem Schritt heran', async () => {
    if (!hasData || !vehicleId) return;

    expect((await saveListing(stranger!, VALID_LISTING, vehicleId)).ok).toBe(false);
    expect((await publishListing(stranger!, vehicleId)).ok).toBe(false);
    expect((await toggleListingPause(stranger!, vehicleId)).ok).toBe(false);
    expect((await markListingSold(stranger!, vehicleId)).ok).toBe(false);
    expect((await deleteListing(stranger!, vehicleId)).ok).toBe(false);

    const unveraendert = await prisma.vehicle.findUnique({ where: { id: vehicleId }, select: { status: true } });
    expect(unveraendert?.status).toBe('DRAFT');
  });

  it('veroeffentlicht, pausiert, verkauft', async () => {
    if (!hasData || !vehicleId) return;

    const live = await publishListing(seller!, vehicleId);
    expect(live.ok).toBe(true);
    if (live.ok) expect(['ACTIVE', 'PENDING_REVIEW']).toContain(live.data.status);

    // Ein frisches Konto landet in der Pruefung -- dort laesst sich nichts
    // pausieren. Die Freigabe der Verwaltung wird nachgestellt, damit der
    // Umschalter selbst geprueft wird.
    if (live.ok && live.data.status === 'PENDING_REVIEW') {
      expect((await toggleListingPause(seller!, vehicleId)).ok).toBe(false);
      await prisma.vehicle.update({ where: { id: vehicleId }, data: { status: 'ACTIVE' } });
    }

    const pause = await toggleListingPause(seller!, vehicleId);
    expect(pause.ok && pause.data.status).toBe('PAUSED');
    const weiter = await toggleListingPause(seller!, vehicleId);
    expect(weiter.ok && weiter.data.status).toBe('ACTIVE');

    expect((await markListingSold(seller!, vehicleId)).ok).toBe(true);
    const verkauft = await prisma.vehicle.findUnique({ where: { id: vehicleId }, select: { status: true, soldAt: true } });
    expect(verkauft?.status).toBe('SOLD');
    expect(verkauft?.soldAt).toBeInstanceOf(Date);
  });

  it('aktualisiert und haelt die Preisaenderung fest', async () => {
    if (!hasData || !vehicleId) return;

    const neu = await saveListing(seller!, { ...VALID_LISTING, priceEur: 11_900 }, vehicleId);
    expect(neu.ok).toBe(true);

    const vehicle = await prisma.vehicle.findUniqueOrThrow({
      where: { id: vehicleId },
      select: { priceCents: true, previousPriceCents: true, priceHistory: { select: { priceCents: true } } },
    });
    expect(vehicle.priceCents).toBe(1_190_000);
    expect(vehicle.previousPriceCents).toBe(1_250_000);
    expect(vehicle.priceHistory.map((p) => p.priceCents)).toContain(1_190_000);
  });

  it('loescht endgueltig', async () => {
    if (!hasData || !vehicleId) return;

    expect((await deleteListing(seller!, vehicleId)).ok).toBe(true);
    expect(await prisma.vehicle.findUnique({ where: { id: vehicleId } })).toBeNull();
    vehicleId = null;
  });
});
