import { prisma } from '@/lib/db';

/** Kennzahlen der Plattform für die Übersicht. */
export async function getPlatformStats() {
  const weekAgo = new Date(Date.now() - 7 * 86_400_000);

  const [
    totalUsers, totalDealers, unverifiedDealers, totalVehicles,
    activeListings, pendingReview, soldListings, newThisWeek, openReports,
    newUsersThisWeek,
  ] = await Promise.all([
    prisma.user.count({ where: { status: { not: 'DELETED' } } }),
    prisma.dealer.count(),
    prisma.dealer.count({ where: { verification: { not: 'VERIFIED' } } }),
    prisma.vehicle.count(),
    prisma.vehicle.count({ where: { status: 'ACTIVE' } }),
    prisma.vehicle.count({ where: { status: 'PENDING_REVIEW' } }),
    prisma.vehicle.count({ where: { status: 'SOLD' } }),
    prisma.vehicle.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.report.count({ where: { status: 'OPEN' } }),
    prisma.user.count({
      where: { status: { not: 'DELETED' }, createdAt: { gte: weekAgo } },
    }),
  ]);

  return {
    totalUsers, totalDealers, unverifiedDealers, totalVehicles,
    activeListings, pendingReview, soldListings, newThisWeek, openReports,
    newUsersThisWeek,
  };
}

/**
 * Die zuletzt angelegten Konten.
 *
 * Steht auf der Uebersicht, weil eine Meldung per Mail nur ankommt, solange
 * der Versand eingerichtet ist -- und weil die Verwaltung hier ohnehin
 * hinschaut. Beides zusammen: gemeldet wird gestossen, nachgesehen wird
 * gezogen.
 */
export function getRecentSignups(take = 8) {
  return prisma.user.findMany({
    where: { status: { not: 'DELETED' } },
    orderBy: { createdAt: 'desc' },
    take,
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      dealer: { select: { companyName: true } },
    },
  });
}

/** Inserate, die auf eine Freigabe warten — die wichtigste Warteschlange. */
export function getPendingVehicles(take = 50) {
  return prisma.vehicle.findMany({
    where: { status: 'PENDING_REVIEW' },
    orderBy: { createdAt: 'asc' },
    take,
    select: {
      id: true, slug: true, title: true, priceCents: true, createdAt: true,
      flaggedReason: true, qualityScore: true,
      brand: { select: { name: true } },
      model: { select: { name: true } },
      seller: { select: { id: true, name: true, email: true, createdAt: true } },
      dealer: { select: { companyName: true, verification: true } },
      images: { select: { url: true }, orderBy: { position: 'asc' }, take: 1 },
      _count: { select: { images: true } },
    },
  });
}

/** Offene und in Bearbeitung befindliche Meldungen. */
export function getOpenReports(take = 100) {
  return prisma.report.findMany({
    where: { status: { in: ['OPEN', 'REVIEWING'] } },
    orderBy: { createdAt: 'asc' },
    take,
    include: {
      vehicle: {
        select: {
          id: true, slug: true, title: true, status: true, priceCents: true,
          images: { select: { url: true }, orderBy: { position: 'asc' }, take: 1 },
        },
      },
      reporter: { select: { name: true, email: true } },
    },
  });
}

/** Händler, sortiert nach Verifizierungsbedarf. */
export function listDealersForAdmin() {
  return prisma.dealer.findMany({
    orderBy: [{ verification: 'asc' }, { createdAt: 'desc' }],
    select: {
      id: true, slug: true, companyName: true, registrationNumber: true,
      verification: true, verifiedAt: true, createdAt: true,
      city: { select: { name: true } },
      user: { select: { id: true, name: true, email: true } },
      _count: { select: { vehicles: true } },
    },
  });
}

/** Nutzerliste mit Freitextsuche. */
export function listUsersForAdmin(query?: string, take = 100) {
  return prisma.user.findMany({
    where: query
      ? {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
            { phone: { contains: query } },
          ],
        }
      : undefined,
    orderBy: { createdAt: 'desc' },
    take,
    select: {
      id: true, name: true, email: true, phone: true, role: true, status: true,
      createdAt: true, suspendedReason: true, verification: true,
      _count: { select: { vehicles: true } },
    },
  });
}

/** Marken mit Modell- und Fahrzeugzahl. */
export async function listBrandsForAdmin() {
  const brands = await prisma.brand.findMany({
    orderBy: [{ popular: 'desc' }, { name: 'asc' }],
    select: {
      id: true, slug: true, name: true, popular: true,
      _count: { select: { models: true, vehicles: true } },
    },
  });

  return brands;
}

/**
 * Ein einzelnes Konto mit allem, was zur Beurteilung gehoert.
 *
 * Bewusst ohne `passwordHash`: er hat auf keiner Seite etwas zu suchen. Aus
 * ihm laesst sich zwar kein Passwort zurueckrechnen, aber eine Zeichenkette,
 * die auf einer Verwaltungsseite steht, landet frueher oder spaeter in einem
 * Bildschirmfoto oder einem Fehlerbericht.
 */
export async function getUserForAdmin(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      phone: true,
      phoneVerified: true,
      role: true,
      status: true,
      locale: true,
      trustScore: true,
      verification: true,
      verifiedAt: true,
      createdAt: true,
      lastSeenAt: true,
      suspendedAt: true,
      suspendedReason: true,

      profile: {
        select: {
          notifyByEmail: true,
          notifyBySms: true,
          city: { select: { name: true, country: { select: { code: true } } } },
        },
      },

      dealer: { select: { id: true, slug: true, companyName: true, verifiedAt: true } },

      _count: {
        select: {
          vehicles: true,
          favorites: true,
          savedSearches: true,
          sentMessages: true,
          reportsFiled: true,
        },
      },

      vehicles: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true, slug: true, title: true, status: true,
          priceCents: true, createdAt: true,
        },
      },
    },
  });
}

/** Zahlungen eines Kontos, neueste zuerst. */
export function listPaymentsForUser(userId: string, take = 10) {
  return prisma.payment.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take,
    select: {
      id: true, amountCents: true, status: true, createdAt: true,
      package: { select: { nameSq: true, nameDe: true, nameEn: true } },
      vehicle: { select: { title: true } },
    },
  });
}
