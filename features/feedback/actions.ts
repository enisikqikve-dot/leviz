'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { getLocale } from 'next-intl/server';

import { fail, fromZod, ok, type ActionResult } from '@/lib/action-result';
import { getSessionUser, requireAdmin } from '@/lib/auth/guards';
import { prisma } from '@/lib/db';
import { RATE_LIMITS, rateLimiter } from '@/lib/rate-limit';
import { getRequestIp } from '@/lib/request-ip';

import { bugReportSchema, bugStatusSchema } from './schemas';

/**
 * Eine Fehlermeldung darf ohne Anmeldung möglich sein.
 *
 * Wer über einen kaputten Anmeldevorgang stolpert, kann sich nicht anmelden,
 * um ihn zu melden — genau die Meldung ginge sonst verloren. Der Preis dafür
 * ist eine Begrenzung nach Absender.
 */
export async function submitBugReportAction(input: unknown): Promise<ActionResult> {
  const ip = await getRequestIp();
  const { limit, windowMs } = RATE_LIMITS.bugReport;

  const attempt = await rateLimiter.check(`bugReport:${ip}`, limit, windowMs);
  if (!attempt.success) return fail('errorTooManyReports');

  const parsed = bugReportSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error.issues);

  // Angemeldete Melder werden erkannt, ohne dass sie etwas eintragen müssen.
  const user = await getSessionUser();

  // Die Browserkennung kommt aus dem Anfragekopf, nicht aus dem Formular:
  // ohne sie ist "geht nicht" wertlos, und aus dem Formular wäre sie beliebig.
  const userAgent = (await headers()).get('user-agent');

  await prisma.bugReport.create({
    data: {
      kind: parsed.data.kind,
      message: parsed.data.message,
      email: parsed.data.email ?? user?.email ?? null,
      pageUrl: parsed.data.pageUrl || null,
      userAgent: userAgent?.slice(0, 500) ?? null,
      locale: await getLocale(),
      reporterId: user?.id ?? null,
    },
  });

  return ok();
}

/** Ändert den Bearbeitungsstand. Nur für die Verwaltung. */
export async function updateBugStatusAction(input: unknown): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = bugStatusSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error.issues);

  const abgeschlossen = parsed.data.status === 'RESOLVED' || parsed.data.status === 'DISMISSED';

  await prisma.bugReport.update({
    where: { id: parsed.data.id },
    data: {
      status: parsed.data.status,
      note: parsed.data.note || null,
      // Wer eine Meldung abgeschlossen hat und wann, gehört festgehalten —
      // sonst lässt sich später nicht nachvollziehen, wer entschieden hat.
      handledById: abgeschlossen ? admin.id : null,
      handledAt: abgeschlossen ? new Date() : null,
    },
  });

  revalidatePath('/admin/bugs');
  return ok();
}
