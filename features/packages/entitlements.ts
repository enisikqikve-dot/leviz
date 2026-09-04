import type { PackageTier } from '@/lib/generated/prisma/enums';

/**
 * Was ein Konto darf, ergibt sich aus seinem Paket — nie aus der Rolle allein.
 * Die Berechnung liegt bewusst in einer reinen Funktion: sie entscheidet ueber
 * Grenzen, die auf dem Server durchgesetzt werden, und muss ohne Datenbank
 * pruefbar sein.
 */

export type PackageLimits = {
  tier: PackageTier;
  /** `null` bedeutet unbegrenzt. */
  listingLimit: number | null;
  listingDurationDays: number;
  photoLimit: number;
  featuredScore: number;
  featuredDays: number;
  hasStatistics: boolean;
  hasBulkTools: boolean;
  hasApiAccess: boolean;
};

/**
 * Was ohne Abo gilt. Entspricht der Stufe FREE aus den Startwerten und dient
 * als Rueckfallebene, wenn ein Abo ausgelaufen ist.
 */
export const FREE_LIMITS: PackageLimits = {
  tier: 'FREE',
  listingLimit: 1,
  listingDurationDays: 45,
  photoLimit: 10,
  featuredScore: 0,
  featuredDays: 0,
  hasStatistics: false,
  hasBulkTools: false,
  hasApiAccess: false,
};

/**
 * Ist das Abo zum angegebenen Zeitpunkt gueltig?
 *
 * Ein gekuendigtes Abo laeuft bis zum Ende der bezahlten Periode weiter — wer
 * bezahlt hat, verliert seine Rechte nicht vorzeitig.
 */
export function isSubscriptionActive(
  subscription: { status: string; currentPeriodEnd: Date } | null,
  now: Date = new Date(),
): boolean {
  if (!subscription) return false;
  if (subscription.status !== 'ACTIVE' && subscription.status !== 'TRIALING') return false;
  return subscription.currentPeriodEnd.getTime() > now.getTime();
}

/** Die geltenden Grenzen: die des Abos, sonst die kostenlose Stufe. */
export function limitsFor(
  subscription: { status: string; currentPeriodEnd: Date; package: PackageLimits } | null,
  now: Date = new Date(),
): PackageLimits {
  return isSubscriptionActive(subscription, now) ? subscription!.package : FREE_LIMITS;
}

/** Wie viele Inserate noch frei sind. `null` bedeutet unbegrenzt. */
export function remainingListings(
  limits: PackageLimits,
  activeCount: number,
): number | null {
  if (limits.listingLimit === null) return null;
  return Math.max(0, limits.listingLimit - activeCount);
}

export function canPublishMore(limits: PackageLimits, activeCount: number): boolean {
  const remaining = remainingListings(limits, activeCount);
  return remaining === null || remaining > 0;
}

/**
 * Wie lange eine gebuchte Hervorhebung laeuft.
 *
 * Eine bestehende Hervorhebung wird verlaengert statt ersetzt: wer zweimal
 * bucht, verliert die Restlaufzeit der ersten Buchung nicht.
 */
export function featuredUntilAfterPurchase(
  current: Date | null,
  days: number,
  now: Date = new Date(),
): Date {
  const start = current && current.getTime() > now.getTime() ? current : now;
  return new Date(start.getTime() + days * 86_400_000);
}

/**
 * Der Hervorhebungswert eines Inserats.
 *
 * Ist die gebuchte Laufzeit abgelaufen, faellt das Inserat auf die regulaere
 * Platzierung zurueck — ohne dass ein Hintergrundauftrag laufen muss.
 */
export function effectiveFeaturedScore(
  vehicle: { featuredScore: number; featuredUntil: Date | null },
  now: Date = new Date(),
): number {
  if (!vehicle.featuredUntil) return 0;
  return vehicle.featuredUntil.getTime() > now.getTime() ? vehicle.featuredScore : 0;
}
