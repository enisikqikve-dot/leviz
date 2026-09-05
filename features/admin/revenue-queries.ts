import { prisma } from '@/lib/db';

import { shiftMonth } from './revenue';

/** Eine Zahlung mit allem, was für Betrag und Bezeichnung gebraucht wird. */
export type PaymentRow = {
  amountCents: number;
  status: string;
  paidAt: Date | null;
  createdAt: Date;
  vehicle: { title: string } | null;
  package: { nameSq: string; nameDe: string; nameEn: string } | null;
};

/** Erster Tag des Monats, der `monthsBack` Monate vor dem laufenden liegt. */
function startOfRange(now: Date, monthsBack: number): Date {
  const [year, month] = shiftMonth(
    `${now.getUTCFullYear()}-${`${now.getUTCMonth() + 1}`.padStart(2, '0')}`,
    -(monthsBack - 1),
  )
    .split('-')
    .map(Number);

  return new Date(Date.UTC(year, month - 1, 1));
}

/**
 * Lädt die Zahlungen des Auswertungszeitraums.
 *
 * Offene Zahlungen kommen unabhängig vom Datum mit: sie stehen noch aus und
 * gehören in die Übersicht, auch wenn sie älter sind.
 */
export async function loadRevenueRows(
  now: Date,
  monthsBack = 12,
): Promise<PaymentRow[]> {
  const since = startOfRange(now, monthsBack);

  return prisma.payment.findMany({
    where: {
      OR: [
        { createdAt: { gte: since } },
        { paidAt: { gte: since } },
        { status: 'PENDING' },
      ],
    },
    select: {
      amountCents: true,
      status: true,
      paidAt: true,
      createdAt: true,
      vehicle: { select: { title: true } },
      package: { select: { nameSq: true, nameDe: true, nameEn: true } },
    },
  });
}
