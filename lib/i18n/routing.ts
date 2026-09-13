import { defineRouting } from 'next-intl/routing';

import { defaultLocale, locales, pathnames } from './pathnames';

export { defaultLocale, locales, pathnames } from './pathnames';
export type { Locale } from './pathnames';

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: 'as-needed',
  pathnames,

  /**
   * Die Sprache wird nicht aus dem Browser erraten.
   *
   * Erraten hiesse hier: nach der Spracheinstellung des Geraets gehen. Das
   * geht am Markt vorbei. Ein Kosovare in Deutschland hat ein deutsches
   * Telefon und liest trotzdem Albanisch — er bekaeme eine deutsche Seite
   * fuer einen albanischen Markt, mit deutschen Ortsnamen und einer Sprache,
   * die er hier gar nicht sucht.
   *
   * `levizz.com` zeigt deshalb immer Albanisch. Wer Deutsch oder Englisch
   * will, waehlt es im Kopfbereich; die Wahl steht danach im Pfad
   * (`/de/...`) und laesst sich verlinken und mit einem Lesezeichen merken.
   */
  localeDetection: false,
});
