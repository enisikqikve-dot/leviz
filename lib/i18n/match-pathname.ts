import { defaultLocale, locales, pathnames, type Locale } from './pathnames';

/**
 * Welche Route steckt hinter einer Adresse?
 *
 * Die Umkehrung von `pathnames`: aus "/de/fahrzeug/bmw-320d-2019-prishtine-x1"
 * wird `{ key: '/vehicle/[slug]', locale: 'de', params: { slug: '…' } }`.
 * Gebraucht von der App, wenn ein Link auf levizz.com oder eine Push-Meldung
 * sie oeffnet -- und von allem, was aus einer gespeicherten Zieladresse
 * wieder wissen muss, was sie bedeutet.
 *
 * Reine Funktion, keine Abhaengigkeit: laeuft im Browser, im Server und in
 * der App.
 */
export type PathMatch = {
  key: keyof typeof pathnames;
  locale: Locale;
  params: Record<string, string>;
  search: string;
};

type Muster = { key: keyof typeof pathnames; locale: Locale; segmente: string[] };

let muster: Muster[] | null = null;

/** Alle Pfade aller Sprachen, in Segmente zerlegt -- einmal gebaut. */
function alleMuster(): Muster[] {
  if (muster) return muster;
  muster = [];
  for (const [key, wert] of Object.entries(pathnames) as [keyof typeof pathnames, string | Record<Locale, string>][]) {
    for (const locale of locales) {
      const pfad = typeof wert === 'string' ? wert : wert[locale];
      muster.push({ key, locale, segmente: pfad.split('/').filter(Boolean) });
    }
  }
  // Laengere Muster zuerst, damit "/dashboard/listings" vor "/dashboard" greift.
  muster.sort((a, b) => b.segmente.length - a.segmente.length);
  return muster;
}

export function matchPathname(input: string): PathMatch | null {
  let pfad = input.trim();
  let search = '';

  // Volle Adresse oder nur Pfad -- beides.
  try {
    const url = new URL(pfad, 'https://levizz.com');
    pfad = url.pathname;
    search = url.search;
  } catch {
    return null;
  }

  const segmente = pfad.split('/').filter(Boolean).map((s) => {
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  });

  // Sprachpraefix abtrennen; Albanisch laeuft ohne.
  let locale: Locale = defaultLocale;
  if (segmente.length > 0 && (locales as readonly string[]).includes(segmente[0]) && segmente[0] !== defaultLocale) {
    locale = segmente.shift() as Locale;
  }

  for (const m of alleMuster()) {
    if (m.locale !== locale || m.segmente.length !== segmente.length) continue;

    const params: Record<string, string> = {};
    let passt = true;
    for (let i = 0; i < m.segmente.length; i++) {
      const soll = m.segmente[i];
      const ist = segmente[i];
      if (soll.startsWith('[') && soll.endsWith(']')) {
        params[soll.slice(1, -1)] = ist;
      } else if (soll !== ist) {
        passt = false;
        break;
      }
    }
    if (passt) return { key: m.key, locale, params, search };
  }

  return null;
}
