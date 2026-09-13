import { z } from 'zod';

import { loadFilterData } from '@/features/search/data';
import { parseSearchParams } from '@/features/search/schema';
import {
  BODY_VALUES, COLOR_VALUES, CUSTOMS_VALUES, DRIVE_VALUES, EMISSION_VALUES,
  FUEL_VALUES, PLATE_VALUES, TRANSMISSION_VALUES,
} from '@/features/search/schema';
import { handle, ok } from '@/lib/api/respond';
import { locales } from '@/lib/i18n/routing';

/**
 * GET /api/v1/catalog?locale=sq&make=bmw
 *
 * Alles, was die Filter und das Inserats-Formular zum Auswaehlen brauchen:
 * Marken mit Trefferzahl, Modelle der gewaehlten Marke, Staedte, Herkunfts-
 * laender, Ausstattung -- und die festen Aufzaehlungen. Die Beschriftungen
 * der Aufzaehlungen kommen aus den Sprachdateien, die die App mitbringt.
 */
const schema = z.object({ locale: z.enum(locales).default('sq') });

export const GET = handle(async (request) => {
  const url = new URL(request.url);
  const { locale } = schema.parse({ locale: url.searchParams.get('locale') ?? undefined });

  const params = parseSearchParams(Object.fromEntries(url.searchParams.entries()));
  const filter = await loadFilterData(params, locale);

  return ok({
    ...filter,
    enums: {
      fuel: FUEL_VALUES,
      transmission: TRANSMISSION_VALUES,
      drive: DRIVE_VALUES,
      body: BODY_VALUES,
      customs: CUSTOMS_VALUES,
      plates: PLATE_VALUES,
      emission: EMISSION_VALUES,
      color: COLOR_VALUES,
    },
  });
});
