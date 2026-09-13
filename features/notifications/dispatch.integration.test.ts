// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { prisma } from '@/lib/db';
import type { PushMessage, PushProvider, PushReceipt, PushTicket } from '@/lib/push';

import { dispatchPendingPush } from './dispatch';

/**
 * Der Versand gegen die echte Datenbank mit einem nachgestellten Anbieter:
 * beansprucht nur, was ein lebendes Geraet hat; legt Tickets ab; legt bei
 * DeviceNotRegistered still -- sofort oder ueber die Quittung.
 */
const EMAIL = 'push-dispatch@leviz.invalid';
let userId: string | null = null;
let hasDb = false;

class Nachgestellt implements PushProvider {
  readonly name = 'test';
  gesendet: PushMessage[] = [];
  antworten: ((m: PushMessage) => PushTicket) | null = null;
  quittungen: PushReceipt[] = [];

  async send(messages: PushMessage[]): Promise<PushTicket[]> {
    this.gesendet.push(...messages);
    return messages.map((m) => this.antworten?.(m) ?? { to: m.to, ok: true, ticketId: `ticket-${m.to}-${this.gesendet.length}` });
  }

  async receipts(ticketIds: string[]): Promise<PushReceipt[]> {
    return this.quittungen.filter((q) => ticketIds.includes(q.ticketId));
  }
}

beforeAll(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    hasDb = true;
  } catch {
    return;
  }
  const user = await prisma.user.upsert({
    where: { email: EMAIL },
    update: {},
    create: { email: EMAIL, name: 'Push-Test', role: 'PRIVATE_SELLER' },
    select: { id: true },
  });
  userId = user.id;
  await prisma.notification.deleteMany({ where: { userId } });
  await prisma.deviceToken.deleteMany({ where: { userId } });
});

afterAll(async () => {
  if (userId) await prisma.user.delete({ where: { id: userId } }).catch(() => {});
});

async function meldung(title: string) {
  return prisma.notification.create({
    data: { userId: userId!, type: 'NEW_MESSAGE', title, body: 'Text', href: '/mesazhet/x' },
    select: { id: true },
  });
}

describe('Push-Versand', () => {
  it('beansprucht nichts, solange kein Geraet angemeldet ist', async () => {
    if (!hasDb) return;
    const n = await meldung('ohne Geraet');
    const anbieter = new Nachgestellt();

    const bericht = await dispatchPendingPush(anbieter);
    expect(anbieter.gesendet.map((m) => m.title)).not.toContain('ohne Geraet');

    const zeile = await prisma.notification.findUnique({ where: { id: n.id }, select: { pushedAt: true } });
    expect(zeile?.pushedAt).toBeNull();
    expect(bericht.claimed).toBe(0);
  });

  it('schickt an jedes lebende Geraet des Kontos und merkt sich das Ticket', async () => {
    if (!hasDb) return;
    await prisma.deviceToken.createMany({
      data: [
        { userId: userId!, token: 'ExponentPushToken[eins]', platform: 'IOS' },
        { userId: userId!, token: 'ExponentPushToken[zwei]', platform: 'ANDROID' },
        { userId: userId!, token: 'ExponentPushToken[tot]', platform: 'ANDROID', disabledAt: new Date() },
      ],
    });
    const n = await meldung('mit Geraet');
    const anbieter = new Nachgestellt();

    const bericht = await dispatchPendingPush(anbieter);

    const anDieses = anbieter.gesendet.filter((m) => m.title === 'mit Geraet');
    expect(anDieses.map((m) => m.to).sort()).toEqual(['ExponentPushToken[eins]', 'ExponentPushToken[zwei]']);
    expect(anDieses[0].data).toEqual({ href: '/mesazhet/x', notificationId: n.id, type: 'NEW_MESSAGE' });
    expect(bericht.sent).toBeGreaterThanOrEqual(2);

    const zeile = await prisma.notification.findUnique({ where: { id: n.id }, select: { pushedAt: true } });
    expect(zeile?.pushedAt).toBeInstanceOf(Date);

    const tickets = await prisma.pushTicket.count({ where: { token: { userId: userId! } } });
    expect(tickets).toBeGreaterThanOrEqual(2);

    // Ein zweiter Lauf schickt dieselbe Meldung nicht noch einmal.
    const zweiter = new Nachgestellt();
    await dispatchPendingPush(zweiter);
    expect(zweiter.gesendet.filter((m) => m.title === 'mit Geraet')).toHaveLength(0);
  });

  it('legt ein Geraet still, das der Dienst sofort ablehnt', async () => {
    if (!hasDb) return;
    await meldung('abgelehnt');
    const anbieter = new Nachgestellt();
    anbieter.antworten = (m) =>
      m.to === 'ExponentPushToken[zwei]'
        ? { to: m.to, ok: false, error: 'DeviceNotRegistered', message: 'weg' }
        : { to: m.to, ok: true, ticketId: `ok-${Math.random()}` };

    const bericht = await dispatchPendingPush(anbieter);
    expect(bericht.disabled).toBe(1);

    const zwei = await prisma.deviceToken.findUnique({ where: { token: 'ExponentPushToken[zwei]' }, select: { disabledAt: true } });
    expect(zwei?.disabledAt).toBeInstanceOf(Date);
  });

  it('legt ein Geraet still, das erst in der Quittung tot ist, und raeumt die Tickets weg', async () => {
    if (!hasDb) return;
    const token = await prisma.deviceToken.findUniqueOrThrow({ where: { token: 'ExponentPushToken[eins]' }, select: { id: true } });
    await prisma.pushTicket.deleteMany({ where: { tokenId: token.id } });
    // Ein Ticket, das alt genug fuer die Quittung ist.
    await prisma.pushTicket.create({ data: { id: 'quittung-eins', tokenId: token.id, createdAt: new Date(Date.now() - 120_000) } });

    const anbieter = new Nachgestellt();
    anbieter.quittungen = [{ ticketId: 'quittung-eins', ok: false, error: 'DeviceNotRegistered', message: 'weg' }];

    const bericht = await dispatchPendingPush(anbieter);
    expect(bericht.receipts).toBeGreaterThanOrEqual(1);

    const eins = await prisma.deviceToken.findUnique({ where: { token: 'ExponentPushToken[eins]' }, select: { disabledAt: true } });
    expect(eins?.disabledAt).toBeInstanceOf(Date);
    expect(await prisma.pushTicket.findUnique({ where: { id: 'quittung-eins' } })).toBeNull();
  });
});
