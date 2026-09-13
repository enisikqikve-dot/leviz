import { z } from 'zod';

import { listDealers } from '@/features/dealers/queries';
import { handle, ok } from '@/lib/api/respond';

/**
 * GET /api/v1/dealers?q=&verified=1&sort=rating|vehicles|name
 *
 * Das Haendlerverzeichnis -- dieselbe Abfrage wie /shitesit auf der Website.
 */
const schema = z.object({
  q: z.string().trim().max(80).optional(),
  verified: z.enum(['1', 'true']).optional(),
  sort: z.enum(['rating', 'vehicles', 'name']).default('rating'),
});

export const GET = handle(async (request) => {
  const url = new URL(request.url);
  const { q, verified, sort } = schema.parse(Object.fromEntries(url.searchParams.entries()));

  const dealers = await listDealers({ query: q, verifiedOnly: Boolean(verified), sort });

  return ok({
    items: dealers.map((d) => ({
      id: d.id,
      slug: d.slug,
      companyName: d.companyName,
      logoUrl: d.logoUrl,
      description: d.description,
      verified: d.verification === 'VERIFIED',
      ratingAvg: d.ratingAvg,
      ratingCount: d.ratingCount,
      city: d.city,
      countryCode: d.country?.code ?? null,
      vehicleCount: d._count.vehicles,
    })),
  });
});
