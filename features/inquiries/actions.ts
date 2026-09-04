'use server';

import { fail, fromZod, ok, type ActionResult } from '@/lib/action-result';
import { getSessionUser } from '@/lib/auth/guards';
import { prisma } from '@/lib/db';
import { EMAIL_FROM, sendEmail } from '@/lib/email';
import { RATE_LIMITS, rateLimiter } from '@/lib/rate-limit';
import { getRequestIp } from '@/lib/request-ip';

import { inquirySchema } from './schemas';

/**
 * Kaufanfrage an den Verkäufer. Sie wird gespeichert und dem Verkäufer per
 * E-Mail zugestellt; der interne Nachrichtenaustausch kommt in Phase 6 dazu.
 */
export async function sendInquiryAction(input: unknown): Promise<ActionResult> {
  const ip = await getRequestIp();
  const limit = RATE_LIMITS.contactSeller;
  const allowed = await rateLimiter.check(`inquiry:${ip}`, limit.limit, limit.windowMs);

  if (!allowed.success) {
    return fail('Zu viele Anfragen. Bitte versuche es später erneut.');
  }

  const parsed = inquirySchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error.issues);

  const { vehicleId, name, email, phone, message } = parsed.data;

  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    select: {
      id: true, title: true, slug: true, status: true,
      seller: { select: { id: true, email: true, name: true, locale: true } },
      dealer: { select: { publicEmail: true, companyName: true } },
    },
  });

  if (!vehicle || vehicle.status !== 'ACTIVE') {
    return fail('Dieses Fahrzeug ist nicht mehr verfügbar');
  }

  const user = await getSessionUser();

  await prisma.$transaction([
    prisma.listingInquiry.create({
      data: {
        vehicleId: vehicle.id,
        userId: user?.id ?? null,
        name, email, phone, message,
      },
    }),
    prisma.vehicle.update({
      where: { id: vehicle.id },
      data: { inquiryCount: { increment: 1 } },
    }),
    prisma.notification.create({
      data: {
        userId: vehicle.seller.id,
        type: 'NEW_MESSAGE',
        title: `Kërkesë e re për ${vehicle.title}`,
        body: message.slice(0, 160),
        href: `/vetura/${vehicle.slug}`,
        data: { vehicleId: vehicle.id },
      },
    }),
  ]);

  const recipient = vehicle.dealer?.publicEmail ?? vehicle.seller.email;

  if (recipient) {
    const contact = [email, phone].filter(Boolean).join(' · ');
    await sendEmail({
      to: recipient,
      replyTo: email ?? EMAIL_FROM,
      subject: `LEVIZ: kërkesë e re për ${vehicle.title}`,
      text: [
        `Përshëndetje,`,
        ``,
        `Keni një kërkesë të re për shpalljen tuaj në LEVIZ:`,
        `${vehicle.title}`,
        ``,
        `Nga: ${name}`,
        `Kontakti: ${contact}`,
        ``,
        `Mesazhi:`,
        message,
        ``,
        `Ekipi i LEVIZ`,
      ].join('\n'),
    });
  }

  return ok();
}
