import { IntlMessageFormat } from 'intl-messageformat';
import { createContext, useContext } from 'react';

import de from '@/messages/de.json';
import en from '@/messages/en.json';
import sq from '@/messages/sq.json';

/**
 * Dieselben Texte wie die Website -- dieselben Dateien.
 *
 * Die drei JSON-Dateien liegen im Hauptprojekt und werden hier direkt
 * geladen. Ein Text, der auf levizz.com geaendert wird, ist beim naechsten
 * Bau der App genauso geaendert. Nichts wird abgeschrieben.
 *
 * Das Format ist ICU, wie bei next-intl: `{count}` und
 * `{count, plural, one {...} other {...}}` funktionieren unveraendert.
 */
export const locales = ['sq', 'de', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'sq';

const messages: Record<Locale, Record<string, unknown>> = { sq, de, en };

/** `vehicles.fuel.DIESEL` -> der Wert im verschachtelten JSON. */
function nachschlagen(locale: Locale, key: string): string | null {
  let knoten: unknown = messages[locale];
  for (const teil of key.split('.')) {
    if (typeof knoten !== 'object' || knoten === null) return null;
    knoten = (knoten as Record<string, unknown>)[teil];
  }
  return typeof knoten === 'string' ? knoten : null;
}

const formatCache = new Map<string, IntlMessageFormat>();

export function translate(
  locale: Locale,
  key: string,
  values?: Record<string, string | number | Date>,
): string {
  // Fehlt ein Text in einer Sprache, greift Albanisch -- und dann der
  // Schluessel selbst, damit die Luecke beim Testen auffaellt.
  const text = nachschlagen(locale, key) ?? nachschlagen(defaultLocale, key) ?? key;
  if (!values) return text;

  const cacheKey = `${locale}:${key}`;
  let format = formatCache.get(cacheKey);
  if (!format) {
    format = new IntlMessageFormat(text, locale === 'sq' ? 'sq-AL' : locale);
    formatCache.set(cacheKey, format);
  }

  try {
    return String(format.format(values));
  } catch {
    return text;
  }
}

export type I18n = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, values?: Record<string, string | number | Date>) => string;
};

export const I18nContext = createContext<I18n>({
  locale: defaultLocale,
  setLocale: () => {},
  t: (key, values) => translate(defaultLocale, key, values),
});

export function useI18n(): I18n {
  return useContext(I18nContext);
}
