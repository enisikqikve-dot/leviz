import { prisma } from '@/lib/db';

import { normalizeCode } from './discount';

/** Alles, was die Prüfung eines Codes braucht — und nicht mehr. */
const CHECK_SELECT = {
  id: true,
  code: true,
  kind: true,
  percentOff: true,
  amountOffCents: true,
  packageId: true,
  maxRedemptions: true,
  redeemedCount: true,
  validFrom: true,
  validUntil: true,
  active: true,
} as const;

export async function findVoucherByCode(input: string) {
  const code = normalizeCode(input);
  if (!code) return null;

  return prisma.voucherCode.findUnique({ where: { code }, select: CHECK_SELECT });
}

export type VoucherForCheck = NonNullable<Awaited<ReturnType<typeof findVoucherByCode>>>;

export async function hasRedeemed(voucherId: string, userId: string): Promise<boolean> {
  const treffer = await prisma.voucherRedemption.findUnique({
    where: { voucherId_userId: { voucherId, userId } },
    select: { id: true },
  });

  return treffer !== null;
}

/**
 * Die Liste für die Verwaltung.
 *
 * Neueste zuerst: wer gerade hundert Codes für eine Aktion erzeugt hat, will
 * sie sofort sehen und nicht ans Ende blättern.
 */
export async function listVouchers(take = 200) {
  return prisma.voucherCode.findMany({
    orderBy: { createdAt: 'desc' },
    take,
    select: {
      ...CHECK_SELECT,
      label: true,
      createdAt: true,
      package: { select: { nameSq: true, tier: true } },
      _count: { select: { redemptions: true } },
    },
  });
}

export type AdminVoucher = Awaited<ReturnType<typeof listVouchers>>[number];

/** Wie viel über alle Codes hinweg schon verschenkt wurde. */
export async function voucherTotals() {
  const [codes, eingeloest, summe] = await Promise.all([
    prisma.voucherCode.count(),
    prisma.voucherRedemption.count(),
    prisma.voucherRedemption.aggregate({ _sum: { amountOffCents: true } }),
  ]);

  return { codes, eingeloest, rabattCents: summe._sum.amountOffCents ?? 0 };
}
