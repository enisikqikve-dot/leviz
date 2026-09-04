import { cache } from 'react';

import type { AiCatalog } from '@/lib/ai';
import { prisma } from '@/lib/db';

/**
 * Marken, Modelle und Städte für den Suchassistenten.
 *
 * Der Assistent liest den Freitext gegen den tatsächlichen Katalog, nicht
 * gegen eine fest verdrahtete Liste. Eine neue Marke wirkt damit sofort, ohne
 * dass jemand den Code anfasst.
 *
 * `cache` bündelt die Abfrage auf einen Aufruf je Anfrage.
 */
export const getAiCatalog = cache(async (): Promise<AiCatalog> => {
  const [brands, models, cities] = await Promise.all([
    prisma.brand.findMany({ select: { slug: true, name: true } }),
    prisma.model.findMany({
      select: { slug: true, name: true, brand: { select: { slug: true } } },
    }),
    // Nur die Kernmärkte: eine Suche nach „Stuttgart“ meint den Importort,
    // nicht den Standort des Fahrzeugs.
    prisma.city.findMany({
      where: { country: { isCoreMarket: true } },
      select: { slug: true, name: true },
    }),
  ]);

  return {
    brands: new Map(brands.map((brand) => [brand.slug, brand.name])),
    models: new Map(
      models.map((model) => [model.slug, { name: model.name, brandSlug: model.brand.slug }]),
    ),
    cities: new Map(cities.map((city) => [city.slug, city.name])),
  };
});
