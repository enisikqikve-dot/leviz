import type { ConversationRow } from './queries';

/**
 * Was die App ueber ein Gespraech erfaehrt.
 *
 * Bewusst ohne die E-Mail-Adresse der Gegenseite: die Abfrage laedt sie fuer
 * den Namensersatz, aber ueber die API soll sie nicht hinaus -- ein Kaeufer
 * muss den Verkaeufer ueber LEVIZ erreichen, nicht an LEVIZ vorbei.
 */
export type ConversationPayload = {
  id: string;
  status: 'OPEN' | 'BLOCKED' | string;
  isBuyer: boolean;
  blockedByMe: boolean;
  counterpartName: string;
  lastMessageAt: Date;
  unread: boolean;
  vehicle: {
    id: string;
    slug: string;
    title: string;
    status: string;
    priceCents: number;
    image: string | null;
  };
  lastMessage: { body: string; createdAt: Date; mine: boolean } | null;
};

export function conversationPayload(row: ConversationRow, userId: string): ConversationPayload {
  return {
    id: row.id,
    status: row.status,
    isBuyer: row.isBuyer,
    blockedByMe: row.status === 'BLOCKED' && row.blockedById === userId,
    counterpartName: row.counterpartName,
    lastMessageAt: row.lastMessageAt,
    unread: row.unread,
    vehicle: {
      id: row.vehicle.id,
      slug: row.vehicle.slug,
      title: row.vehicle.title,
      status: row.vehicle.status,
      priceCents: row.vehicle.priceCents,
      image: row.vehicle.images[0]?.url ?? null,
    },
    lastMessage: row.lastMessage
      ? { body: row.lastMessage.body, createdAt: row.lastMessage.createdAt, mine: row.lastMessage.senderId === userId }
      : null,
  };
}
