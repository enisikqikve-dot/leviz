'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { fail, fromZod, ok, type ActionResult } from '@/lib/action-result';
import { requireUser } from '@/lib/auth/guards';
import { prisma } from '@/lib/db';

const reviewSchema = z.object({
  dealerId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  body: z.string().trim().max(2000).optional().or(z.literal('')),
});

/**
 * Bewertung eines Händlers.
 *
 * Pro Nutzer und Händler gibt es genau eine — sonst könnte ein Wettbewerber
 * eine Bewertung beliebig oft abgeben. Der Durchschnitt wird am Händler
 * mitgeführt, damit Verzeichnis und Suche ihn nicht bei jedem Aufruf neu
 * berechnen müssen.
 */
export async function submitReviewAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error.issues);

  const { dealerId, rating, body } = parsed.data;

  const dealer = await prisma.dealer.findUnique({
    where: { id: dealerId },
    select: { id: true, userId: true },
  });

  if (!dealer) return fail('Ky autosallon nuk u gjet');
  if (dealer.userId === user.id) return fail('Nuk mund të vlerësoni veten');

  const existing = await prisma.review.findUnique({
    where: { dealerId_authorId: { dealerId, authorId: user.id } },
    select: { id: true },
  });

  if (existing) return fail('Keni vlerësuar tashmë këtë autosallon');

  // Als bestätigt gilt, wer schon einmal Kontakt zu diesem Händler hatte.
  const hadContact = await prisma.conversation.count({
    where: { buyerId: user.id, vehicle: { dealerId } },
  });

  await prisma.review.create({
    data: {
      dealerId,
      authorId: user.id,
      rating,
      body: body || null,
      verified: hadContact > 0,
    },
  });

  const stats = await prisma.review.aggregate({
    where: { dealerId },
    _avg: { rating: true },
    _count: true,
  });

  await prisma.dealer.update({
    where: { id: dealerId },
    data: {
      ratingAvg: Number((stats._avg.rating ?? 0).toFixed(2)),
      ratingCount: stats._count,
    },
  });

  revalidatePath('/dealers');
  return ok();
}
