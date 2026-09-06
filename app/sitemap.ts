import type { MetadataRoute } from 'next';

import { prisma } from '@/lib/db';
import { getPathname } from '@/lib/i18n/navigation';
import { defaultLocale, routing } from '@/lib/i18n/routing';
import { siteConfig } from '@/lib/site';

/**
 * Sitemap über alle drei Sprachfassungen.
 *
 * Jeder Eintrag führt seine Übersetzungen unter `alternates.languages` mit.
 * Bei übersetzten Pfaden — `/vetura/…` gegen `/en/vehicle/…` — ist der
 * Zusammenhang sonst nicht erkennbar, und die Fassungen konkurrieren
 * miteinander statt sich zu ergänzen.
 *
 * Aufgeführt wird nur, was auch indexiert werden soll: gefilterte
 * Ergebnislisten und alles hinter der Anmeldung bleiben draußen.
 */

/**
 * Bei jedem Abruf frisch, nicht beim Bauen erzeugt.
 *
 * Zwei Gründe. Sachlich: eine Sitemap, die den Bestand vom Zeitpunkt der
 * Veröffentlichung zeigt, ist am nächsten Tag falsch — neue Inserate fehlen,
 * verkaufte stehen noch drin. Praktisch: beim Bauen im Container gibt es keine
 * Datenbank, die man dafür befragen könnte.
 */
export const dynamic = 'force-dynamic';

type Href = Parameters<typeof getPathname>[0]['href'];

const url = (href: Href, locale: (typeof routing.locales)[number]) =>
  `${siteConfig.url}${getPathname({ href, locale })}`;

/** Ein Eintrag je Seite, mit allen Sprachfassungen. */
function entry(
  href: Href,
  options: { changeFrequency?: MetadataRoute.Sitemap[number]['changeFrequency']; priority?: number; lastModified?: Date } = {},
): MetadataRoute.Sitemap[number] {
  return {
    url: url(href, defaultLocale),
    lastModified: options.lastModified,
    changeFrequency: options.changeFrequency,
    priority: options.priority,
    alternates: {
      languages: Object.fromEntries(
        routing.locales.map((locale) => [locale, url(href, locale)]),
      ),
    },
  };
}

/** Öffentliche Seiten ohne eigene Daten. */
const STATIC: { href: Href; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }[] = [
  { href: '/', priority: 1, changeFrequency: 'daily' },
  { href: '/search', priority: 0.9, changeFrequency: 'hourly' },
  { href: '/dealers', priority: 0.7, changeFrequency: 'weekly' },
  { href: '/pricing', priority: 0.5, changeFrequency: 'monthly' },
  { href: '/compare', priority: 0.3, changeFrequency: 'monthly' },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [vehicles, dealers] = await Promise.all([
    prisma.vehicle.findMany({
      where: { status: 'ACTIVE' },
      select: { slug: true, updatedAt: true },
      orderBy: { rankScore: 'desc' },
      // Sitemaps fassen höchstens 50.000 Einträge; die Grenze hält Luft für
      // Händler und statische Seiten.
      take: 45_000,
    }),
    prisma.dealer.findMany({
      select: { slug: true, updatedAt: true },
      orderBy: { ratingAvg: 'desc' },
      take: 2_000,
    }),
  ]);

  return [
    ...STATIC.map((page) =>
      entry(page.href, { priority: page.priority, changeFrequency: page.changeFrequency }),
    ),

    ...vehicles.map((vehicle) =>
      entry(
        { pathname: '/vehicle/[slug]', params: { slug: vehicle.slug } },
        { lastModified: vehicle.updatedAt, changeFrequency: 'weekly', priority: 0.8 },
      ),
    ),

    ...dealers.map((dealer) =>
      entry(
        { pathname: '/dealer/[slug]', params: { slug: dealer.slug } },
        { lastModified: dealer.updatedAt, changeFrequency: 'weekly', priority: 0.6 },
      ),
    ),
  ];
}
