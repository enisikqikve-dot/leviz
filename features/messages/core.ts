import { z } from 'zod';

import { fail, fromZod, ok, type ActionResult } from '@/lib/action-result';
import { prisma } from '@/lib/db';
import { EMAIL_FROM, sendEmail } from '@/lib/email';
import { RATE_LIMITS, rateLimiter } from '@/lib/rate-limit';

/**
 * Gespraeche und Nachrichten -- ein Weg fuer Website und App.
 *
 * Wer schreibt, kommt als Kennung herein (aus dem Cookie oder dem Token);
 * ob er darf, entscheidet diese Datei anhand der Datenbank. Die Website-
 * Actions sind duenne Huellen darum, die API ruft dieselben Funktionen.
 */
export const messageSchema = z.object({
  conversationId: z.string().min(1),
  body: z.string().trim().min(1, 'Mesazhi është bosh').max(4000),
});

export const startSchema = z.object({
  vehicleId: z.string().min(1),
  body: z.string().trim().min(10, 'Mesazhi është shumë i shkurtër').max(4000),
});

export type SentMessage = { id: string; conversationId: string; body: string; createdAt: Date };

/**
 * Startet ein Gespräch zum Fahrzeug oder öffnet das bestehende.
 *
 * Pro Fahrzeug und Käufer gibt es genau einen Faden — sonst entstünden
 * parallele Unterhaltungen über dasselbe Auto, und der Verkäufer verliert den
 * Überblick.
 */
export async function startConversation(
  userId: string,
  input: unknown,
): Promise<ActionResult<{ conversationId: string }>> {
  const limit = RATE_LIMITS.contactSeller;
  const allowed = await rateLimiter.check(`message:${userId}`, limit.limit, limit.windowMs);
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
  if (vehicle.sellerId === userId) {
    return fail('Nuk mund të kontaktoni veten');
  }

  const now = new Date();

  const conversation = await prisma.conversation.upsert({
    where: { vehicleId_buyerId: { vehicleId: vehicle.id, buyerId: userId } },
    update: { lastMessageAt: now, status: 'OPEN' },
    create: {
      vehicleId: vehicle.id,
      buyerId: userId,
      sellerId: vehicle.sellerId,
      lastMessageAt: now,
      buyerReadAt: now,
    },
    select: { id: true, status: true },
  });

  if (conversation.status === 'BLOCKED') return fail('Kjo bisedë është bllokuar');

  await prisma.$transaction([
    prisma.message.create({
      data: { conversationId: conversation.id, senderId: userId, body: parsed.data.body },
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

  return ok({ conversationId: conversation.id });
}

/** Antwort in einem bestehenden Gespräch. */
export async function sendMessage(userId: string, input: unknown): Promise<ActionResult<SentMessage>> {
  const parsed = messageSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error.issues);

  const conversation = await prisma.conversation.findUnique({
    where: { id: parsed.data.conversationId },
    select: { id: true, buyerId: true, sellerId: true, status: true },
  });

  if (!conversation) return fail('Kjo bisedë nuk u gjet');
  if (conversation.buyerId !== userId && conversation.sellerId !== userId) {
    return fail('Nuk keni qasje në këtë bisedë');
  }
  if (conversation.status === 'BLOCKED') return fail('Kjo bisedë është bllokuar');

  const recipientId = conversation.buyerId === userId ? conversation.sellerId : conversation.buyerId;
  const now = new Date();

  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: { conversationId: conversation.id, senderId: userId, body: parsed.data.body },
      select: { id: true, conversationId: true, body: true, createdAt: true },
    }),
    prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: now,
        // Wer schreibt, hat den Faden offensichtlich gelesen.
        ...(conversation.buyerId === userId ? { buyerReadAt: now } : { sellerReadAt: now }),
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

  return ok(message);
}

/** Markiert ein Gespräch als gelesen. */
export async function markConversationRead(userId: string, id: string): Promise<ActionResult> {
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    select: { buyerId: true, sellerId: true },
  });

  if (!conversation) return fail('Kjo bisedë nuk u gjet');

  const now = new Date();

  if (conversation.buyerId === userId) {
    await prisma.conversation.update({ where: { id }, data: { buyerReadAt: now } });
  } else if (conversation.sellerId === userId) {
    await prisma.conversation.update({ where: { id }, data: { sellerReadAt: now } });
  } else {
    return fail('Nuk keni qasje në këtë bisedë');
  }

  return ok();
}

/** Blockiert ein Gespräch oder gibt es wieder frei. */
export async function toggleConversationBlock(
  userId: string,
  id: string,
): Promise<ActionResult<{ blocked: boolean }>> {
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    select: { buyerId: true, sellerId: true, status: true, blockedById: true },
  });

  if (!conversation) return fail('Kjo bisedë nuk u gjet');
  if (conversation.buyerId !== userId && conversation.sellerId !== userId) {
    return fail('Nuk keni qasje në këtë bisedë');
  }

  const isBlocked = conversation.status === 'BLOCKED';

  // Freigeben darf nur, wer selbst blockiert hat.
  if (isBlocked && conversation.blockedById !== userId) {
    return fail('Kjo bisedë është bllokuar nga pala tjetër');
  }

  await prisma.conversation.update({
    where: { id },
    data: isBlocked
      ? { status: 'OPEN', blockedById: null }
      : { status: 'BLOCKED', blockedById: userId },
  });

  return ok({ blocked: !isBlocked });
}
