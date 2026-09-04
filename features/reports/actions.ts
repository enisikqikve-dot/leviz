'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { fail, fromZod, ok, type ActionResult } from '@/lib/action-result';
import { getSessionUser } from '@/lib/auth/guards';
import { prisma } from '@/lib/db';
import { RATE_LIMITS, rateLimiter } from '@/lib/rate-limit';
import { getRequestIp } from '@/lib/request-ip';

import { REPORT_REASONS } from './constants';

const reportSchema = z.object({
  vehicleId: z.string().min(1),
  reason: z.enum(REPORT_REASONS),
  details: z.string().trim().max(1000).optional().or(z.literal('')),
});

/**
 * Meldung eines Inserats.
 *
 * Auch ohne Anmeldung möglich — wer Betrug sieht, soll ihn melden können, ohne
 * sich vorher zu registrieren. Missbrauch bremst die Begrenzung nach
 * Absenderadresse.
 */
export async function reportVehicleAction(input: unknown): Promise<ActionResult> {
  const ip = await getRequestIp();
  const limit = RATE_LIMITS.contactSeller;
  const allowed = await rateLimiter.check(`report:${ip}`, limit.limit, limit.windowMs);

  if (!allowed.success) return fail('Zu viele Meldungen. Bitte später erneut versuchen.');

  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error.issues);

  const vehicle = await prisma.vehicle.findUnique({
    where: { id: parsed.data.vehicleId },
    select: { id: true },
  });
  if (!vehicle) return fail('Kjo shpallje nuk u gjet');

  const user = await getSessionUser();

  if (user) {
    // Eine offene Meldung je Nutzer und Fahrzeug genügt.
    const existing = await prisma.report.count({
      where: {
        vehicleId: vehicle.id,
        reporterId: user.id,
        status: { in: ['OPEN', 'REVIEWING'] },
      },
    });
    if (existing > 0) return fail('E keni raportuar tashmë këtë shpallje');
  }

  await prisma.report.create({
    data: {
      vehicleId: vehicle.id,
      reporterId: user?.id ?? null,
      reason: parsed.data.reason,
      details: parsed.data.details || null,
    },
  });

  revalidatePath('/admin/reports');
  return ok();
}
