import { requireApiUser } from '@/lib/api/auth';
import { handle, noContent } from '@/lib/api/respond';
import { prisma } from '@/lib/db';

/**
 * POST /api/v1/notifications/{id}/read -> als gelesen markieren.
 *
 * Nur die eigene: die Bedingung auf userId sorgt dafuer, dass eine fremde
 * Kennung stumm ins Leere laeuft, statt eine fremde Meldung zu veraendern.
 */
export const POST = handle(async (request, { params }) => {
  const user = await requireApiUser(request);
  const { id } = await params;

  await prisma.notification.updateMany({
    where: { id, userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });

  return noContent();
});
