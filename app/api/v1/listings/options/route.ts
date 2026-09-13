import { z } from 'zod';

import { loadWizardData } from '@/features/listings/data';
import { getLimits } from '@/features/packages/queries';
import { requireApiUser } from '@/lib/api/auth';
import { handle, ok } from '@/lib/api/respond';
import { locales } from '@/lib/i18n/routing';
import { MAX_IMAGES_PER_LISTING } from '@/lib/storage/validate';

/**
 * GET /api/v1/listings/options?locale=sq
 *
 * Die Auswahllisten des Inserat-Assistenten: alle Marken, die Staedte der
 * Kernmaerkte, Herkunftslaender, Ausstattung -- dieselben, die die Website
 * an ihren Assistenten uebergibt. Dazu die Fotogrenze des eigenen Pakets,
 * damit die App sie anzeigen kann, bevor der Server sie durchsetzt.
 *
 * Modelle einer Marke kommen von GET /api/v1/catalog?make=... .
 */
const schema = z.object({ locale: z.enum(locales).default('sq') });

export const GET = handle(async (request) => {
  const user = await requireApiUser(request);

  const url = new URL(request.url);
  const { locale } = schema.parse({ locale: url.searchParams.get('locale') ?? undefined });

  const [data, limits] = await Promise.all([loadWizardData(locale), getLimits(user.id)]);

  return ok({
    ...data,
    photoLimit: Math.min(limits.photoLimit, MAX_IMAGES_PER_LISTING),
  });
});
