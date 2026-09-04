import { getPathname } from '@/lib/i18n/navigation';
import { defaultLocale, routing, type Locale } from '@/lib/i18n/routing';
import { siteConfig } from '@/lib/site';

/**
 * Kanonische Adresse und Sprachverweise für eine Seite.
 *
 * Jede Sprachfassung verweist auf alle anderen. Ohne das behandelt eine
 * Suchmaschine die drei Fassungen als konkurrierende Seiten und spielt im
 * Kosovo womöglich die englische aus — bei übersetzten Pfaden wie `/kerko`
 * gegen `/en/search` ist der Zusammenhang sonst nicht erkennbar.
 *
 * `x-default` zeigt auf Albanisch: das ist die Sprache des Zielmarkts und
 * läuft ohne Präfix.
 */
type Href = Parameters<typeof getPathname>[0]['href'];

export function absoluteUrl(href: Href, locale: Locale): string {
  return `${siteConfig.url}${getPathname({ href, locale })}`;
}

export function alternatesFor(href: Href, locale: Locale) {
  const languages: Record<string, string> = {};

  for (const other of routing.locales) {
    languages[other] = absoluteUrl(href, other);
  }

  languages['x-default'] = absoluteUrl(href, defaultLocale);

  return {
    canonical: absoluteUrl(href, locale),
    languages,
  };
}
