import { prisma } from '@/lib/db';
import type { Locale } from '@/lib/i18n/routing';

import { FREE_LIMITS, limitsFor, type PackageLimits } from './entitlements';

/** Auswahl, die fuer die Grenzen eines Pakets noetig ist. */
const LIMIT_FIELDS = {
  tier: true,
  listingLimit: true,
  listingDurationDays: true,
  photoLimit: true,
  featuredScore: true,
  featuredDays: true,
  hasStatistics: true,
  hasBulkTools: true,
  hasApiAccess: true,
} as const;

export type PackageCard = PackageLimits & {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  interval: 'ONE_TIME' | 'MONTHLY' | 'YEARLY';
  isDealerPackage: boolean;
  sortOrder: number;
};

/** Name und Beschreibung in der aktiven Sprache. */
function localize(
  row: {
    nameSq: string; nameDe: string; nameEn: string;
    descriptionSq: string | null; descriptionDe: string | null; descriptionEn: string | null;
  },
  locale: Locale,
): { name: string; description: string | null } {
  switch (locale) {
    case 'de':
      return { name: row.nameDe, description: row.descriptionDe };
    case 'en':
      return { name: row.nameEn, description: row.descriptionEn };
    default:
      return { name: row.nameSq, description: row.descriptionSq };
  }
}

/** Alle buchbaren Pakete, in der im Verwaltungsbereich gesetzten Reihenfolge. */
export async function listPackages(locale: Locale): Promise<PackageCard[]> {
  const rows = await prisma.package.findMany({
    where: { active: true },
    orderBy: { sortOrder: 'asc' },
    select: {
      ...LIMIT_FIELDS,
      id: true,
      nameSq: true, nameDe: true, nameEn: true,
      descriptionSq: true, descriptionDe: true, descriptionEn: true,
      priceCents: true,
      interval: true,
      isDealerPackage: true,
      sortOrder: true,
    },
  });

  return rows.map((row) => ({ ...row, ...localize(row, locale) }));
}

/**
 * Das laufende Abo eines Kontos.
 *
 * Es kann mehrere geben, wenn frueher gebucht und spaeter gewechselt wurde;
 * maßgeblich ist das zuletzt begonnene.
 */
export async function getActiveSubscription(userId: string) {
  return prisma.subscription.findFirst({
    where: { userId, status: { in: ['ACTIVE', 'TRIALING'] } },
    orderBy: { currentPeriodStart: 'desc' },
    select: {
      id: true,
      status: true,
      currentPeriodStart: true,
      currentPeriodEnd: true,
      cancelAtPeriodEnd: true,
      package: {
        select: {
          ...LIMIT_FIELDS,
          id: true,
          nameSq: true, nameDe: true, nameEn: true,
          priceCents: true,
          interval: true,
        },
      },
    },
  });
}

/** Die geltenden Grenzen eines Kontos. Ohne gueltiges Abo die kostenlose Stufe. */
export async function getLimits(userId: string): Promise<PackageLimits> {
  const subscription = await getActiveSubscription(userId);
  if (!subscription) return FREE_LIMITS;

  return limitsFor({
    status: subscription.status,
    currentPeriodEnd: subscription.currentPeriodEnd,
    package: subscription.package,
  });
}

/** Wie viele Inserate eines Kontos zaehlen gegen die Grenze. */
export async function countBillableListings(userId: string): Promise<number> {
  return prisma.vehicle.count({
    where: {
      sellerId: userId,
      // Verkauft, abgelehnt oder abgelaufen belegt keinen Platz mehr.
      status: { in: ['ACTIVE', 'PENDING_REVIEW', 'PAUSED', 'DRAFT'] },
    },
  });
}

/** Zahlungsverlauf eines Kontos, neueste zuerst. */
export async function listPayments(userId: string, take = 20) {
  return prisma.payment.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take,
    select: {
      id: true,
      amountCents: true,
      currency: true,
      status: true,
      provider: true,
      paidAt: true,
      createdAt: true,
      // Der Bezug wird angezeigt, nicht die eingefrorene Beschreibung.
      vehicle: { select: { title: true } },
      package: { select: { nameSq: true, nameDe: true, nameEn: true } },
    },
  });
}
