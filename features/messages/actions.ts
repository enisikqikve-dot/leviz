'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { fail, fromZod, ok, type ActionResult } from '@/lib/action-result';
import { requireUser } from '@/lib/auth/guards';
import { prisma } from '@/lib/db';
import { EMAIL_FROM, sendEmail } from '@/lib/email';
import { RATE_LIMITS, rateLimiter } from '@/lib/rate-limit';

const messageSchema = z.object({
  conversationId: z.string().min(1),
  body: z.string().trim().min(1, 'Mesazhi është bosh').max(4000),
});

const startSchema = z.object({
  vehicleId: z.string().min(1),
  body: z.string().trim().min(10, 'Mesazhi është shumë i shkurtër').max(4000),
});

/**
 * Startet ein Gespräch zum Fahrzeug oder öffnet das bestehende.
 *
 * Pro Fahrzeug und Käufer gibt es genau einen Faden — sonst entstünden
 * parallele Unterhaltungen über dasselbe Auto, und der Verkäufer verliert den
 * Überblick.
 */
export async function startConversationAction(
  input: unknown,
): Promise<ActionResult<{ conversationId: string }>> {
  const user = await requireUser();

  const limit = RATE_LIMITS.contactSeller;
  const allowed = await rateLimiter.check(`message:${user.id}`, limit.limit, limit.windowMs);
  if (!allowed.success) return fail('Zu viele Nachrichten. Bitte kurz warten.');

  const parsed = startSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error.issues);

  const vehicle = await prisma.vehicle.findUnique({
    where: { id: parsed.data.vehicleId },
    select: {
      id: true, slug: true, title: true, status: true, sellerId: true,
      seller: { select: { email: true, locale: true } },
    },
  });

  if (!vehicle || vehicle.status !== 'ACTIVE') {
    return fail('Kjo veturë nuk është më e disponueshme');
  }
  if (vehicle.sellerId === user.id) {
    return fail('Nuk mund të kontaktoni veten');
  }

  const now = new Date();

  const conversation = await prisma.conversation.upsert({
    where: { vehicleId_buyerId: { vehicleId: vehicle.id, buyerId: user.id } },
    update: { lastMessageAt: now, status: 'OPEN' },
    create: {
      vehicleId: vehicle.id,
      buyerId: user.id,
      sellerId: vehicle.sellerId,
      lastMessageAt: now,
      buyerReadAt: now,
    },
    select: { id: true, status: true },
  });

  if (conversation.status === 'BLOCKED') return fail('Kjo bisedë është bllokuar');

  await prisma.$transaction([
    prisma.message.create({
      data: { conversationId: conversation.id, senderId: user.id, body: parsed.data.body },
    }),
    prisma.vehicle.update({
      where: { id: vehicle.id },
      data: { inquiryCount: { increment: 1 } },
    }),
    prisma.notification.create({
      data: {
        userId: vehicle.sellerId,
        type: 'NEW_MESSAGE',
        title: `Mesazh i ri për ${vehicle.title}`,
        body: parsed.data.body.slice(0, 160),
        href: `/mesazhet/${conversation.id}`,
        data: { conversationId: conversation.id, vehicleId: vehicle.id },
      },
    }),
  ]);

  if (vehicle.seller.email) {
    await sendEmail({
      to: vehicle.seller.email,
      replyTo: EMAIL_FROM,
      subject: `LEVIZ: mesazh i ri për ${vehicle.title}`,
      text: [
        'Keni një mesazh të ri në LEVIZ:',
        vehicle.title,
        '',
        parsed.data.body,
        '',
        'Përgjigjuni drejtpërdrejt në LEVIZ.',
      ].join('\n'),
    });
  }

  revalidatePath('/messages');
  return ok({ conversationId: conversation.id });
}

/** Antwort in einem bestehenden Gespräch. */
export async function sendMessageAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = messageSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error.issues);

  const conversation = await prisma.conversation.findUnique({
    where: { id: parsed.data.conversationId },
    select: { id: true, buyerId: true, sellerId: true, status: true },
  });

  if (!conversation) return fail('Kjo bisedë nuk u gjet');
  if (conversation.buyerId !== user.id && conversation.sellerId !== user.id) {
    return fail('Nuk keni qasje në këtë bisedë');
  }
  if (conversation.status === 'BLOCKED') return fail('Kjo bisedë është bllokuar');

  const recipientId =
    conversation.buyerId === user.id ? conversation.sellerId : conversation.buyerId;
  const now = new Date();

  await prisma.$transaction([
    prisma.message.create({
      data: { conversationId: conversation.id, senderId: user.id, body: parsed.data.body },
    }),
    prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: now,
        // Wer schreibt, hat den Faden offensichtlich gelesen.
        ...(conversation.buyerId === user.id
          ? { buyerReadAt: now }
          : { sellerReadAt: now }),
      },
    }),
    prisma.notification.create({
      data: {
        userId: recipientId,
        type: 'NEW_MESSAGE',
        title: 'Mesazh i ri',
        body: parsed.data.body.slice(0, 160),
        href: `/mesazhet/${conversation.id}`,
        data: { conversationId: conversation.id },
      },
    }),
  ]);

  revalidatePath(`/messages/${conversation.id}`);
  revalidatePath('/messages');
  return ok();
}

/** Markiert ein Gespräch als gelesen. */
export async function markConversationReadAction(id: string): Promise<ActionResult> {
  const user = await requireUser();

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    select: { buyerId: true, sellerId: true },
  });

  if (!conversation) return fail('Kjo bisedë nuk u gjet');

  const now = new Date();

  if (conversation.buyerId === user.id) {
    await prisma.conversation.update({ where: { id }, data: { buyerReadAt: now } });
  } else if (conversation.sellerId === user.id) {
    await prisma.conversation.update({ where: { id }, data: { sellerReadAt: now } });
  } else {
    return fail('Nuk keni qasje në këtë bisedë');
  }

  return ok();
}

/** Blockiert ein Gespräch oder gibt es wieder frei. */
export async function toggleConversationBlockAction(
  id: string,
): Promise<ActionResult<{ blocked: boolean }>> {
  const user = await requireUser();

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    select: { buyerId: true, sellerId: true, status: true, blockedById: true },
  });

  if (!conversation) return fail('Kjo bisedë nuk u gjet');
  if (conversation.buyerId !== user.id && conversation.sellerId !== user.id) {
    return fail('Nuk keni qasje në këtë bisedë');
  }

  const isBlocked = conversation.status === 'BLOCKED';

  // Freigeben darf nur, wer selbst blockiert hat.
  if (isBlocked && conversation.blockedById !== user.id) {
    return fail('Kjo bisedë është bllokuar nga pala tjetër');
  }

  await prisma.conversation.update({
    where: { id },
    data: isBlocked
      ? { status: 'OPEN', blockedById: null }
      : { status: 'BLOCKED', blockedById: user.id },
  });

  revalidatePath(`/messages/${id}`);
  return ok({ blocked: !isBlocked });
}
