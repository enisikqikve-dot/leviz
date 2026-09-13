import { requireApiUser } from '@/lib/api/auth';
import { handle, notFound, ok } from '@/lib/api/respond';
import { accountPayload, ACCOUNT_SELECT } from '@/lib/api/serialize';
import { prisma } from '@/lib/db';

/** GET /api/v1/me -> das eigene Konto. */
export const GET = handle(async (request) => {
  const user = await requireApiUser(request);

  const konto = await prisma.user.findUnique({ where: { id: user.id }, select: ACCOUNT_SELECT });
  if (!konto) throw notFound('account');

  return ok(accountPayload(konto));
});
