import { prisma } from '@/lib/db';

/** Kennzahlen der Plattform für die Übersicht. */
export async function getPlatformStats() {
  const weekAgo = new Date(Date.now() - 7 * 86_400_000);

  const [
    totalUsers, totalDealers, unverifiedDealers, totalVehicles,
    activeListings, pendingReview, soldListings, newThisWeek, openReports,
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
  ]);

  return {
    totalUsers, totalDealers, unverifiedDealers, totalVehicles,
    activeListings, pendingReview, soldListings, newThisWeek, openReports,
  };
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
      createdAt: true, suspendedReason: true,
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
