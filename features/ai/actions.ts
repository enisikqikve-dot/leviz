'use server';

import { z } from 'zod';

import { fail, fromZod, ok, type ActionResult } from '@/lib/action-result';
import { requireUser } from '@/lib/auth/guards';
import { prisma } from '@/lib/db';
import { getAiProvider, type SearchIntent } from '@/lib/ai';
import { getLocale } from 'next-intl/server';
import type { Locale } from '@/lib/i18n/routing';
import { RATE_LIMITS, rateLimiter } from '@/lib/rate-limit';

import { searchSchema, toQueryString } from '@/features/search/schema';

import { getAiCatalog } from './catalog';

/**
 * Eingaben des Inserat-Assistenten, soweit sie in eine Beschreibung gehören.
 *
 * Bewusst eine eigene, enge Form: an den Textgenerator geht nur, was im
 * Inserat steht. So kann kein Feld hineinrutschen, das der Verkäufer nie
 * angegeben hat.
 */
const describeSchema = z.object({
  brandSlug: z.string().min(1).max(80),
  modelSlug: z.string().min(1).max(80),
  variant: z.string().max(80).optional(),
  registrationYear: z.number().int().min(1950).max(2100).optional(),
  mileageKm: z.number().int().min(0).max(2_000_000).optional(),
  fuel: z.string().max(40).optional(),
  transmission: z.string().max(40).optional(),
  powerKw: z.number().int().min(0).max(2000).optional(),
  bodyType: z.string().max(40).optional(),
  doors: z.number().int().min(1).max(9).optional(),
  seats: z.number().int().min(1).max(99).optional(),
  color: z.string().max(40).optional(),
  customsStatus: z.enum(['CLEARED', 'NOT_CLEARED', 'NOT_APPLICABLE']).optional(),
  plateOrigin: z.enum(['RKS', 'AL', 'MK', 'FOREIGN', 'NONE']).optional(),
  importedFrom: z.string().max(80).optional(),
  accidentFree: z.boolean().optional(),
  serviceHistory: z.boolean().optional(),
  ownersCount: z.number().int().min(1).max(20).optional(),
  features: z.array(z.string().max(60)).max(40).optional(),
});

/**
 * Erzeugt einen Beschreibungsvorschlag.
 *
 * Der Text ist ein Vorschlag, kein fertiger Inhalt — der Verkäufer bearbeitet
 * ihn im Formular weiter und verantwortet, was am Ende dort steht.
 */
export async function generateDescriptionAction(
  input: unknown,
): Promise<ActionResult<{ text: string }>> {
  const user = await requireUser();

  const parsed = describeSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error.issues);

  // Textgenerierung ist billig, aber nicht umsonst: eine Grenze verhindert,
  // dass ein Skript den späteren Anbieter auf unsere Kosten beschäftigt.
  const allowed = await rateLimiter.check(
    `ai:describe:${user.id}`,
    RATE_LIMITS.aiDescribe.limit,
    RATE_LIMITS.aiDescribe.windowMs,
  );
  if (!allowed.success) return fail('Shumë kërkesa. Provo përsëri pas pak.');

  const data = parsed.data;
  const locale = (await getLocale()) as Locale;

  const [brand, model] = await Promise.all([
    prisma.brand.findUnique({ where: { slug: data.brandSlug }, select: { name: true } }),
    prisma.model.findFirst({
      where: { slug: data.modelSlug, brand: { slug: data.brandSlug } },
      select: { name: true },
    }),
  ]);

  if (!brand || !model) return fail('Marka ose modeli nuk u gjet');

  const provider = await getAiProvider();

  const text = await provider.describe({
    brand: brand.name,
    model: model.name,
    variant: data.variant,
    year: data.registrationYear ?? null,
    mileageKm: data.mileageKm ?? null,
    fuel: data.fuel ?? null,
    transmission: data.transmission ?? null,
    powerKw: data.powerKw ?? null,
    bodyType: data.bodyType ?? null,
    doors: data.doors ?? null,
    seats: data.seats ?? null,
    color: data.color ?? null,
    customsStatus: data.customsStatus ?? null,
    plateOrigin: data.plateOrigin ?? null,
    importedFrom: data.importedFrom ?? null,
    accidentFree: data.accidentFree ?? null,
    serviceHistory: data.serviceHistory ?? null,
    ownersCount: data.ownersCount ?? null,
    features: data.features,
    locale,
  });

  return ok({ text });
}

const assistantSchema = z.object({ text: z.string().trim().min(2).max(200) });

export type InterpretedSearch = {
  /** Fertige Adressparameter, bereits gegen das Suchschema geprüft. */
  query: Record<string, string>;
  matched: string[];
  ignored: string[];
};

/**
 * Übersetzt einen Freitext in Suchfilter.
 *
 * Das Ergebnis läuft durch dasselbe Schema wie jede andere Suche. Der
 * Assistent kann dadurch keinen Filter setzen, den die Suche nicht kennt —
 * er ist eine Eingabehilfe, kein zweiter Weg an der Prüfung vorbei.
 *
 * Ohne Anmeldung nutzbar: die Suche ist der Einstieg ins Portal.
 */
export async function interpretSearchAction(
  input: unknown,
): Promise<ActionResult<InterpretedSearch>> {
  const parsed = assistantSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error.issues);

  const locale = (await getLocale()) as Locale;
  const [provider, catalog] = await Promise.all([getAiProvider(), getAiCatalog()]);

  const result = await provider.interpretSearch(parsed.data.text, locale, catalog);

  const checked = searchSchema.parse(toSearchInput(result.intent));

  return ok({
    query: toQueryString(checked),
    matched: result.matched,
    ignored: result.ignored,
  });
}

/** Die gelesene Absicht in die Zeichenkettenform der Adresszeile bringen. */
function toSearchInput(intent: SearchIntent): Record<string, string> {
  const out: Record<string, string> = {};

  for (const [key, value] of Object.entries(intent)) {
    if (value === undefined) continue;
    out[key] = Array.isArray(value) ? value.join(',') : String(value);
  }

  return out;
}
