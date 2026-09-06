import { prisma } from '@/lib/db';
import type { PaymentEvent } from '@/lib/payments';
import { computeRankScore } from '@/features/search/ranking';

import { featuredUntilAfterPurchase } from './entitlements';

/**
 * Was nach einer bezahlten Zahlung passiert.
 *
 * Bewusst getrennt von der Bezahlseite: Erfuellt wird ausschliesslich hier,
 * ausgeloest durch den signierten Rueckruf des Anbieters. Ein Nutzer, der die
 * Bezahlseite abbricht oder ihre Adresse errät, bekommt dadurch nichts.
 *
 * Die Funktion ist mehrfach aufrufbar. Anbieter senden Rueckrufe bei
 * Zustellproblemen erneut; eine bereits abgeschlossene Zahlung darf dann kein
 * zweites Abo und keine zweite Verlaengerung erzeugen.
 */
export type FulfilmentResult =
  | { applied: false; reason: 'unknown' | 'alreadySettled' }
  | { applied: true; kind: 'subscription' | 'feature' | 'failure' };

/** Laufzeit einer Abrechnungsperiode in Tagen. */
function periodDays(interval: 'ONE_TIME' | 'MONTHLY' | 'YEARLY'): number {
  switch (interval) {
    case 'YEARLY':
      return 365;
    case 'MONTHLY':
      return 30;
    default:
      // Einmalige Pakete laufen so lange wie die Inseratslaufzeit, die sie gewaehren.
      return 0;
  }
}

/**
 * Gibt einen fuer eine gescheiterte Zahlung reservierten Gutschein wieder frei.
 *
 * Reserviert wird beim Start der Zahlung, sonst koennten zwei Kaeufer
 * denselben letzten freien Platz bekommen. Bleibt die Zahlung dann aus, waere
 * der Code ohne die Freigabe verbraucht -- der Kunde haette nichts bekommen
 * und koennte es kein zweites Mal versuchen.
 */
async function gutscheinFreigeben(paymentId: string): Promise<void> {
  const einloesung = await prisma.voucherRedemption.findUnique({
    where: { paymentId },
    select: { id: true, voucherId: true },
  });

  if (!einloesung) return;

  await prisma.$transaction([
    prisma.voucherRedemption.delete({ where: { id: einloesung.id } }),
    prisma.voucherCode.update({
      where: { id: einloesung.voucherId },
      data: { redeemedCount: { decrement: 1 } },
    }),
  ]);
}

export async function applyPaymentEvent(event: PaymentEvent): Promise<FulfilmentResult> {
  const payment = await prisma.payment.findUnique({
    where: { id: event.paymentId },
    select: {
      id: true,
      status: true,
      userId: true,
      vehicleId: true,
      packageId: true,
      package: {
        select: {
          id: true,
          interval: true,
          featuredScore: true,
          featuredDays: true,
          listingDurationDays: true,
          isDealerPackage: true,
        },
      },
    },
  });

  if (!payment) return { applied: false, reason: 'unknown' };
  if (payment.status !== 'PENDING') return { applied: false, reason: 'alreadySettled' };

  if (event.status === 'FAILED') {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'FAILED',
        failureReason: event.failureReason ?? null,
        providerPaymentId: event.providerPaymentId,
      },
    });

    await gutscheinFreigeben(payment.id);

    return { applied: true, kind: 'failure' };
  }

  const now = new Date();
  const pkg = payment.package;

  // Ohne Paketbezug ist nichts zu gewaehren; die Zahlung wird nur verbucht.
  if (!pkg) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'SUCCEEDED', paidAt: now, providerPaymentId: event.providerPaymentId },
    });
    return { applied: true, kind: 'failure' };
  }

  // --- Hervorhebung eines einzelnen Inserats -------------------------------
  if (payment.vehicleId) {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: payment.vehicleId },
      select: {
        id: true,
        featuredUntil: true,
        qualityScore: true,
        seller: { select: { trustScore: true } },
      },
    });

    if (!vehicle) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'SUCCEEDED',
          paidAt: now,
          providerPaymentId: event.providerPaymentId,
          failureReason: 'Fahrzeug nicht mehr vorhanden',
        },
      });
      return { applied: true, kind: 'failure' };
    }

    const featuredUntil = featuredUntilAfterPurchase(vehicle.featuredUntil, pkg.featuredDays, now);

    await prisma.$transaction([
      prisma.vehicle.update({
        where: { id: vehicle.id },
        data: {
          featuredScore: pkg.featuredScore,
          featuredUntil,
          rankScore: computeRankScore({
            featuredScore: pkg.featuredScore,
            qualityScore: vehicle.qualityScore,
            sellerTrustScore: vehicle.seller.trustScore,
          }),
        },
      }),
      prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'SUCCEEDED', paidAt: now, providerPaymentId: event.providerPaymentId },
      }),
      prisma.notification.create({
        data: {
          userId: payment.userId,
          type: 'PAYMENT_SUCCEEDED',
          title: 'Shpallja u theksua',
          body: `Deri më ${featuredUntil.toISOString().slice(0, 10)}`,
          data: { vehicleId: vehicle.id },
        },
      }),
    ]);

    return { applied: true, kind: 'feature' };
  }

  // --- Paket buchen oder verlaengern ---------------------------------------
  const days = periodDays(pkg.interval) || pkg.listingDurationDays;

  const existing = await prisma.subscription.findFirst({
    where: { userId: payment.userId, status: { in: ['ACTIVE', 'TRIALING'] } },
    orderBy: { currentPeriodStart: 'desc' },
    select: { id: true, packageId: true, currentPeriodEnd: true },
  });

  // Dasselbe Paket verlaengert die laufende Periode, ein anderes loest sie ab.
  const samePackage = existing?.packageId === pkg.id;
  const start = samePackage && existing.currentPeriodEnd > now ? existing.currentPeriodEnd : now;
  const currentPeriodEnd = new Date(start.getTime() + days * 86_400_000);

  const dealer = await prisma.dealer.findUnique({
    where: { userId: payment.userId },
    select: { id: true },
  });

  await prisma.$transaction(async (tx) => {
    if (existing && !samePackage) {
      await tx.subscription.update({
        where: { id: existing.id },
        data: { status: 'CANCELED', canceledAt: now },
      });
    }

    if (existing && samePackage) {
      await tx.subscription.update({
        where: { id: existing.id },
        data: { currentPeriodEnd, cancelAtPeriodEnd: false, canceledAt: null },
      });
    } else {
      await tx.subscription.create({
        data: {
          userId: payment.userId,
          dealerId: pkg.isDealerPackage ? dealer?.id ?? null : null,
          packageId: pkg.id,
          status: 'ACTIVE',
          currentPeriodStart: now,
          currentPeriodEnd,
        },
      });
    }

    await tx.payment.update({
      where: { id: payment.id },
      data: { status: 'SUCCEEDED', paidAt: now, providerPaymentId: event.providerPaymentId },
    });

    await tx.notification.create({
      data: {
        userId: payment.userId,
        type: 'PAYMENT_SUCCEEDED',
        title: 'Pakoja u aktivizua',
        body: `Deri më ${currentPeriodEnd.toISOString().slice(0, 10)}`,
        data: { packageId: pkg.id },
      },
    });
  });

  return { applied: true, kind: 'subscription' };
}
