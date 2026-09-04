import { prisma } from '@/lib/db';

/** Gesprächsliste eines Nutzers, neueste Nachricht zuerst. */
export async function getConversations(userId: string) {
  const conversations = await prisma.conversation.findMany({
    where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
    orderBy: { lastMessageAt: 'desc' },
    include: {
      vehicle: {
        select: {
          id: true, slug: true, title: true, status: true, priceCents: true,
          brand: { select: { name: true } },
          model: { select: { name: true } },
          images: { select: { url: true }, orderBy: { position: 'asc' }, take: 1 },
        },
      },
      buyer: { select: { id: true, name: true, email: true } },
      seller: { select: { id: true, name: true, email: true } },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { body: true, createdAt: true, senderId: true },
      },
    },
  });

  return conversations.map((conversation) => {
    const isBuyer = conversation.buyerId === userId;
    const counterpart = isBuyer ? conversation.seller : conversation.buyer;
    const readAt = isBuyer ? conversation.buyerReadAt : conversation.sellerReadAt;
    const last = conversation.messages[0];

    return {
      ...conversation,
      isBuyer,
      counterpartName: counterpart.name ?? counterpart.email ?? '—',
      lastMessage: last ?? null,
      // Ungelesen ist, was nach dem letzten Ansehen und nicht von einem selbst kam.
      unread: Boolean(
        last && last.senderId !== userId && (!readAt || last.createdAt > readAt),
      ),
    };
  });
}

export type ConversationRow = Awaited<ReturnType<typeof getConversations>>[number];

/**
 * Ein einzelner Gesprächsfaden. Gibt `null` zurück, wenn der Nutzer weder
 * Käufer noch Verkäufer ist — der Zugriff wird hier entschieden, nicht in der
 * Oberfläche.
 */
export async function getConversation(id: string, userId: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      vehicle: {
        select: {
          id: true, slug: true, title: true, status: true, priceCents: true,
          brand: { select: { name: true } },
          model: { select: { name: true } },
          images: { select: { url: true }, orderBy: { position: 'asc' }, take: 1 },
        },
      },
      buyer: { select: { id: true, name: true, email: true } },
      seller: { select: { id: true, name: true, email: true } },
      messages: { orderBy: { createdAt: 'asc' } },
    },
  });

  if (!conversation) return null;
  if (conversation.buyerId !== userId && conversation.sellerId !== userId) return null;

  const isBuyer = conversation.buyerId === userId;
  const counterpart = isBuyer ? conversation.seller : conversation.buyer;

  return {
    ...conversation,
    isBuyer,
    counterpartName: counterpart.name ?? counterpart.email ?? '—',
  };
}

/** Anzahl ungelesener Gespräche, für die Kopfzeile. */
export async function countUnreadConversations(userId: string): Promise<number> {
  const conversations = await prisma.conversation.findMany({
    where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
    select: {
      buyerId: true, buyerReadAt: true, sellerReadAt: true,
      messages: {
        orderBy: { createdAt: 'desc' }, take: 1,
        select: { senderId: true, createdAt: true },
      },
    },
  });

  return conversations.filter((conversation) => {
    const last = conversation.messages[0];
    if (!last || last.senderId === userId) return false;

    const readAt =
      conversation.buyerId === userId ? conversation.buyerReadAt : conversation.sellerReadAt;
    return !readAt || last.createdAt > readAt;
  }).length;
}
