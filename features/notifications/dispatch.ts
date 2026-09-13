import { prisma } from '@/lib/db';
import type { NotificationType } from '@/lib/generated/prisma/enums';
import { getPushProvider, type PushMessage, type PushProvider } from '@/lib/push';

/**
 * Der Push-Versand: was noch nicht aufs Telefon ging, geht jetzt.
 *
 * Meldungen entstehen an zehn Stellen in Transaktionen -- neue Nachricht,
 * Freigabe, Preisaenderung, Zahlung. Statt an jeder Stelle einen Versand
 * anzuhaengen (vor dem Commit, und bei einem Rollback fuer nichts), sieht
 * diese Funktion alle paar Sekunden nach, was seit dem letzten Mal
 * angekommen ist. Sie holt sich die Zeilen mit einem einzigen UPDATE, das
 * `pushedAt` setzt und die Zeilen zurueckgibt: zwei Laeufe gleichzeitig
 * bekaemen so nie dieselbe Meldung (FOR UPDATE SKIP LOCKED).
 *
 * Ein Telefon, das es nicht mehr gibt, faellt beim Dienst als
 * DeviceNotRegistered auf -- sofort als Ticket oder spaeter als Quittung.
 * In beiden Faellen wird das Token stillgelegt, nicht geloescht.
 */
export type DispatchReport = {
  claimed: number;
  sent: number;
  failed: number;
  disabled: number;
  receipts: number;
};

type Beansprucht = {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string | null;
  href: string | null;
};

const HOECHSTALTER_STUNDEN = 24;
const LOS = 200;
const QUITTUNG_NACH_SEKUNDEN = 60;

export async function dispatchPendingPush(
  provider: PushProvider = getPushProvider(),
  now: Date = new Date(),
): Promise<DispatchReport> {
  const bericht: DispatchReport = { claimed: 0, sent: 0, failed: 0, disabled: 0, receipts: 0 };

  // Nur Meldungen an Konten mit einem lebenden Geraet werden beansprucht.
  // Alles andere bleibt "unversendet" -- meldet sich das Telefon spaeter an,
  // bekommt es nicht den Stau der letzten Woche, sondern nur, was ab dann
  // kommt: die Altersgrenze sorgt dafuer.
  const beansprucht = await prisma.$queryRaw<Beansprucht[]>`
    UPDATE "Notification" SET "pushedAt" = ${now}
    WHERE "id" IN (
      SELECT n."id" FROM "Notification" n
      WHERE n."pushedAt" IS NULL
        AND n."createdAt" > ${new Date(now.getTime() - HOECHSTALTER_STUNDEN * 3_600_000)}
        AND EXISTS (SELECT 1 FROM "DeviceToken" d WHERE d."userId" = n."userId" AND d."disabledAt" IS NULL)
      ORDER BY n."createdAt"
      LIMIT ${LOS}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING "id", "userId", "type", "title", "body", "href"
  `;
  bericht.claimed = beansprucht.length;

  if (beansprucht.length > 0) {
    const tokens = await prisma.deviceToken.findMany({
      where: { userId: { in: [...new Set(beansprucht.map((n) => n.userId))] }, disabledAt: null },
      select: { id: true, userId: true, token: true },
    });
    const jeNutzer = new Map<string, typeof tokens>();
    for (const t of tokens) jeNutzer.set(t.userId, [...(jeNutzer.get(t.userId) ?? []), t]);

    const nachrichten: (PushMessage & { tokenId: string })[] = [];
    for (const n of beansprucht) {
      for (const t of jeNutzer.get(n.userId) ?? []) {
        nachrichten.push({
          tokenId: t.id,
          to: t.token,
          title: n.title,
          body: n.body ?? undefined,
          data: { href: n.href ?? '', notificationId: n.id, type: n.type },
        });
      }
    }

    if (nachrichten.length > 0) {
      const tickets = await provider.send(nachrichten.map((m) => ({ to: m.to, title: m.title, body: m.body, data: m.data })));
      const stillzulegen = new Set<string>();
      const quittungen: { id: string; tokenId: string }[] = [];

      tickets.forEach((ticket, index) => {
        const { tokenId } = nachrichten[index];
        if (ticket.ok) {
          bericht.sent++;
          if (ticket.ticketId) quittungen.push({ id: ticket.ticketId, tokenId });
          return;
        }
        bericht.failed++;
        if (ticket.error === 'DeviceNotRegistered') stillzulegen.add(tokenId);
        else console.warn(`  LEVIZ Push: ${ticket.error} -- ${ticket.message}`);
      });

      if (quittungen.length > 0) {
        await prisma.pushTicket.createMany({ data: quittungen, skipDuplicates: true });
      }
      if (stillzulegen.size > 0) {
        const r = await prisma.deviceToken.updateMany({
          where: { id: { in: [...stillzulegen] }, disabledAt: null },
          data: { disabledAt: now },
        });
        bericht.disabled += r.count;
      }
    }
  }

  // --- Quittungen ---------------------------------------------------------
  const faellig = await prisma.pushTicket.findMany({
    where: { createdAt: { lt: new Date(now.getTime() - QUITTUNG_NACH_SEKUNDEN * 1000) } },
    select: { id: true, tokenId: true, createdAt: true },
    take: 300,
    orderBy: { createdAt: 'asc' },
  });

  if (faellig.length > 0) {
    const ergebnisse = await provider.receipts(faellig.map((t) => t.id));
    const tokenVon = new Map(faellig.map((t) => [t.id, t.tokenId]));
    const erledigt: string[] = [];
    const stillzulegen = new Set<string>();

    for (const r of ergebnisse) {
      erledigt.push(r.ticketId);
      bericht.receipts++;
      if (!r.ok) {
        if (r.error === 'DeviceNotRegistered') stillzulegen.add(tokenVon.get(r.ticketId)!);
        else console.warn(`  LEVIZ Push-Quittung: ${r.error} -- ${r.message}`);
      }
    }

    // Was nach einem Tag immer noch keine Quittung hat, bekommt keine mehr.
    const veraltet = faellig
      .filter((t) => t.createdAt < new Date(now.getTime() - HOECHSTALTER_STUNDEN * 3_600_000))
      .map((t) => t.id);

    if (erledigt.length + veraltet.length > 0) {
      await prisma.pushTicket.deleteMany({ where: { id: { in: [...erledigt, ...veraltet] } } });
    }
    if (stillzulegen.size > 0) {
      const r = await prisma.deviceToken.updateMany({
        where: { id: { in: [...stillzulegen] }, disabledAt: null },
        data: { disabledAt: now },
      });
      bericht.disabled += r.count;
    }
  }

  return bericht;
}
