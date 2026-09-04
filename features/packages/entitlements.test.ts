import { describe, expect, it } from 'vitest';

import {
  canPublishMore,
  effectiveFeaturedScore,
  featuredUntilAfterPurchase,
  FREE_LIMITS,
  isSubscriptionActive,
  limitsFor,
  remainingListings,
  type PackageLimits,
} from './entitlements';

const NOW = new Date('2026-09-04T12:00:00Z');
const day = (offset: number) => new Date(NOW.getTime() + offset * 86_400_000);

const PREMIUM: PackageLimits = {
  tier: 'PREMIUM',
  listingLimit: 3,
  listingDurationDays: 60,
  photoLimit: 20,
  featuredScore: 40,
  featuredDays: 7,
  hasStatistics: true,
  hasBulkTools: false,
  hasApiAccess: false,
};

const ENTERPRISE: PackageLimits = { ...PREMIUM, tier: 'DEALER_ENTERPRISE', listingLimit: null };

describe('Gültigkeit eines Abos', () => {
  it('erkennt ein laufendes Abo', () => {
    expect(isSubscriptionActive({ status: 'ACTIVE', currentPeriodEnd: day(10) }, NOW)).toBe(true);
  });

  it('lässt eine Probezeit gelten', () => {
    expect(isSubscriptionActive({ status: 'TRIALING', currentPeriodEnd: day(3) }, NOW)).toBe(true);
  });

  it('erkennt ein abgelaufenes Abo', () => {
    expect(isSubscriptionActive({ status: 'ACTIVE', currentPeriodEnd: day(-1) }, NOW)).toBe(false);
  });

  it('erkennt ein gekündigtes Abo', () => {
    expect(isSubscriptionActive({ status: 'CANCELED', currentPeriodEnd: day(10) }, NOW)).toBe(false);
  });

  it('behandelt kein Abo als ungültig', () => {
    expect(isSubscriptionActive(null, NOW)).toBe(false);
  });
});

describe('Geltende Grenzen', () => {
  it('nimmt die Grenzen des laufenden Abos', () => {
    const limits = limitsFor(
      { status: 'ACTIVE', currentPeriodEnd: day(5), package: PREMIUM },
      NOW,
    );
    expect(limits.tier).toBe('PREMIUM');
  });

  it('fällt nach Ablauf auf die kostenlose Stufe zurück', () => {
    const limits = limitsFor(
      { status: 'ACTIVE', currentPeriodEnd: day(-5), package: PREMIUM },
      NOW,
    );
    expect(limits).toBe(FREE_LIMITS);
  });

  it('gilt ohne Abo als kostenlose Stufe', () => {
    expect(limitsFor(null, NOW)).toBe(FREE_LIMITS);
  });
});

describe('Freie Inserate', () => {
  it('zählt herunter', () => {
    expect(remainingListings(PREMIUM, 1)).toBe(2);
  });

  it('wird nie negativ', () => {
    expect(remainingListings(PREMIUM, 9)).toBe(0);
  });

  it('meldet unbegrenzt als null', () => {
    expect(remainingListings(ENTERPRISE, 5_000)).toBeNull();
  });

  it('lässt unter der Grenze veröffentlichen', () => {
    expect(canPublishMore(PREMIUM, 2)).toBe(true);
  });

  it('sperrt an der Grenze', () => {
    expect(canPublishMore(PREMIUM, 3)).toBe(false);
  });

  it('sperrt die kostenlose Stufe nach dem ersten Inserat', () => {
    expect(canPublishMore(FREE_LIMITS, 1)).toBe(false);
  });

  it('sperrt ein unbegrenztes Paket nie', () => {
    expect(canPublishMore(ENTERPRISE, 100_000)).toBe(true);
  });
});

describe('Laufzeit einer Hervorhebung', () => {
  it('beginnt bei einer neuen Buchung jetzt', () => {
    expect(featuredUntilAfterPurchase(null, 7, NOW)).toEqual(day(7));
  });

  it('verlängert eine laufende Hervorhebung statt sie zu ersetzen', () => {
    // Wer zweimal bucht, darf die Restlaufzeit nicht verlieren.
    expect(featuredUntilAfterPurchase(day(3), 7, NOW)).toEqual(day(10));
  });

  it('beginnt nach einer abgelaufenen Hervorhebung wieder bei jetzt', () => {
    expect(featuredUntilAfterPurchase(day(-3), 7, NOW)).toEqual(day(7));
  });
});

describe('Wirksamer Hervorhebungswert', () => {
  it('zählt innerhalb der Laufzeit', () => {
    expect(effectiveFeaturedScore({ featuredScore: 40, featuredUntil: day(2) }, NOW)).toBe(40);
  });

  it('fällt nach Ablauf auf null, ohne dass ein Auftrag laufen muss', () => {
    expect(effectiveFeaturedScore({ featuredScore: 40, featuredUntil: day(-1) }, NOW)).toBe(0);
  });

  it('ist ohne Buchung null', () => {
    expect(effectiveFeaturedScore({ featuredScore: 80, featuredUntil: null }, NOW)).toBe(0);
  });
});
