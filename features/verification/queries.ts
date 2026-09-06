import { prisma } from '@/lib/db';

/** Was der Antragsteller selbst sehen darf: Stand, Datum, Begründung. */
export async function getLatestVerification(userId: string) {
  return prisma.verificationRequest.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      kind: true,
      status: true,
      note: true,
      legalName: true,
      companyName: true,
      createdAt: true,
      reviewedAt: true,
      documentsPurgedAt: true,
      _count: { select: { documents: true } },
    },
  });
}

export type LatestVerification = Awaited<ReturnType<typeof getLatestVerification>>;

const ADMIN_SELECT = {
  id: true,
  kind: true,
  status: true,
  legalName: true,
  addressLine: true,
  postalCode: true,
  city: true,
  companyName: true,
  registrationNumber: true,
  note: true,
  createdAt: true,
  reviewedAt: true,
  documentsPurgedAt: true,
  user: {
    select: { id: true, name: true, email: true, phone: true, createdAt: true },
  },
  reviewedBy: { select: { name: true, email: true } },
  documents: { select: { id: true, type: true, contentType: true, sizeBytes: true } },
} as const;

/**
 * Offene Anträge, der älteste zuerst: wer zuerst gewartet hat, kommt zuerst
 * dran. Nach dem Datum absteigend zu sortieren hiesse, dass ein Antrag in
 * einer vollen Woche nie an die Reihe käme.
 */
export async function listPendingVerifications() {
  return prisma.verificationRequest.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
    select: ADMIN_SELECT,
  });
}

export async function listDecidedVerifications(take = 30) {
  return prisma.verificationRequest.findMany({
    where: { status: { in: ['VERIFIED', 'REJECTED'] } },
    orderBy: { reviewedAt: 'desc' },
    take,
    select: ADMIN_SELECT,
  });
}

export type AdminVerification = Awaited<ReturnType<typeof listPendingVerifications>>[number];

export async function countPendingVerifications(): Promise<number> {
  return prisma.verificationRequest.count({ where: { status: 'PENDING' } });
}

/** Ein einzelner Beleg samt Antrag — für die Ausgabe an den Verwalter. */
export async function getVerificationDocument(id: string) {
  return prisma.verificationDocument.findUnique({
    where: { id },
    select: {
      id: true,
      storageKey: true,
      contentType: true,
      request: { select: { id: true, userId: true, documentsPurgedAt: true } },
    },
  });
}
