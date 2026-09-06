'use server';

import { revalidatePath } from 'next/cache';

import { fail, fromZod, ok, type ActionResult } from '@/lib/action-result';
import { requireAdmin, requireUser } from '@/lib/auth/guards';
import { prisma } from '@/lib/db';

import { checkVoucher, generateCodes } from './discount';
import { findVoucherByCode, hasRedeemed } from './queries';
import { createVoucherSchema, previewVoucherSchema } from './schemas';

export type VoucherPreview = {
  code: string;
  discountCents: number;
  finalCents: number;
  free: boolean;
};

/**
 * Rechnet einen Code vor, ohne ihn einzulösen.
 *
 * Der Kunde soll vor dem Bezahlen sehen, was er zahlt. Eingelöst wird erst
 * beim Kauf — sonst verbrauchte schon das Ausprobieren den Code.
 */
export async function previewVoucherAction(
  input: unknown,
): Promise<ActionResult<VoucherPreview>> {
  const user = await requireUser();

  const parsed = previewVoucherSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error.issues);

  const voucher = await findVoucherByCode(parsed.data.code);
  // Ein unbekannter Code und ein abgelaufener bekommen bewusst dieselbe
  // Antwort: sonst liesse sich hierueber die Codeliste durchprobieren.
  if (!voucher) return fail('errorUnknown');

  const pkg = await prisma.package.findFirst({
    where: { id: parsed.data.packageId, active: true },
    select: { id: true, priceCents: true },
  });
  if (!pkg) return fail('errorPackage');

  const ergebnis = checkVoucher(voucher, pkg.priceCents, {
    now: new Date(),
    packageId: pkg.id,
    alreadyRedeemed: await hasRedeemed(voucher.id, user.id),
  });

  if (!ergebnis.ok) return fail(`errorVoucher.${ergebnis.reason}`);

  return ok({
    code: voucher.code,
    discountCents: ergebnis.discountCents,
    finalCents: ergebnis.finalCents,
    free: ergebnis.free,
  });
}

/** Legt einen oder viele Codes an. Nur für die Verwaltung. */
export async function createVouchersAction(
  input: unknown,
): Promise<ActionResult<{ codes: string[] }>> {
  const admin = await requireAdmin();

  const parsed = createVoucherSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error.issues);

  const daten = parsed.data;

  if (daten.packageId) {
    const vorhanden = await prisma.package.findUnique({
      where: { id: daten.packageId },
      select: { id: true },
    });
    if (!vorhanden) return fail('errorPackage');
  }

  // Mehr erzeugen als nötig und die bereits vergebenen aussortieren: bei
  // acht Stellen ist eine Kollision unwahrscheinlich, aber nicht unmöglich.
  const vorschlaege = generateCodes(daten.prefix ?? '', daten.count + 10);

  const belegt = new Set(
    (
      await prisma.voucherCode.findMany({
        where: { code: { in: vorschlaege } },
        select: { code: true },
      })
    ).map((eintrag) => eintrag.code),
  );

  const codes = vorschlaege.filter((code) => !belegt.has(code)).slice(0, daten.count);
  if (codes.length < daten.count) return fail('errorGenerate');

  await prisma.voucherCode.createMany({
    data: codes.map((code) => ({
      code,
      label: daten.label,
      kind: daten.kind,
      percentOff: daten.kind === 'PERCENT' ? (daten.percentOff ?? null) : null,
      amountOffCents:
        daten.kind === 'AMOUNT' ? Math.round((daten.amountOffEuro ?? 0) * 100) : null,
      packageId: daten.packageId,
      maxRedemptions: daten.maxRedemptions,
      validUntil: daten.validUntil ? new Date(daten.validUntil) : null,
      createdById: admin.id,
    })),
  });

  revalidatePath('/admin/vouchers');
  return ok({ codes });
}

/** Schaltet einen Code ab oder wieder frei. */
export async function setVoucherActiveAction(
  id: string,
  active: boolean,
): Promise<ActionResult> {
  await requireAdmin();

  const voucher = await prisma.voucherCode.findUnique({ where: { id }, select: { id: true } });
  if (!voucher) return fail('errorUnknown');

  await prisma.voucherCode.update({ where: { id }, data: { active } });

  revalidatePath('/admin/vouchers');
  return ok();
}

/**
 * Löscht einen Code.
 *
 * Nur solange er nie eingelöst wurde. Ein eingelöster Code gehört zu einer
 * Zahlung; ihn zu entfernen hiesse, die Buchhaltung um ihre Begründung zu
 * bringen. Ein solcher Code wird abgeschaltet, nicht gelöscht.
 */
export async function deleteVoucherAction(id: string): Promise<ActionResult> {
  await requireAdmin();

  const voucher = await prisma.voucherCode.findUnique({
    where: { id },
    select: { id: true, _count: { select: { redemptions: true } } },
  });

  if (!voucher) return fail('errorUnknown');
  if (voucher._count.redemptions > 0) return fail('errorRedeemed');

  await prisma.voucherCode.delete({ where: { id } });

  revalidatePath('/admin/vouchers');
  return ok();
}
