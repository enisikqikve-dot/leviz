import { defineRouting } from 'next-intl/routing';

export const locales = ['sq', 'de', 'en'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'sq';

/**
 * Jede Route existiert intern einmal (englischer Schlüssel) und wird pro Sprache
 * auf einen eigenen, suchmaschinenfreundlichen Pfad abgebildet. Albanisch ist
 * Standard und läuft ohne Präfix.
 */
export const pathnames = {
  '/': '/',

  '/search': { sq: '/kerko', de: '/suche', en: '/search' },
  '/compare': { sq: '/krahaso', de: '/vergleich', en: '/compare' },
  '/vehicle/[slug]': {
    sq: '/vetura/[slug]',
    de: '/fahrzeug/[slug]',
    en: '/vehicle/[slug]',
  },

  '/sell': { sq: '/shit', de: '/verkaufen', en: '/sell' },
  '/sell/create': {
    sq: '/shit/krijo',
    de: '/verkaufen/erstellen',
    en: '/sell/create',
  },
  '/sell/edit/[id]': {
    sq: '/shit/ndrysho/[id]',
    de: '/verkaufen/bearbeiten/[id]',
    en: '/sell/edit/[id]',
  },

  '/favorites': { sq: '/te-preferuarat', de: '/merkliste', en: '/favorites' },
  '/searches': { sq: '/kerkimet', de: '/suchauftraege', en: '/searches' },

  '/messages': { sq: '/mesazhet', de: '/nachrichten', en: '/messages' },
  '/messages/[id]': {
    sq: '/mesazhet/[id]',
    de: '/nachrichten/[id]',
    en: '/messages/[id]',
  },

  '/dealers': { sq: '/shitesit', de: '/haendler', en: '/dealers' },
  '/dealer/[slug]': {
    sq: '/shitesi/[slug]',
    de: '/haendler/[slug]',
    en: '/dealer/[slug]',
  },

  '/dashboard': { sq: '/paneli', de: '/konto', en: '/dashboard' },
  '/dashboard/listings': {
    sq: '/paneli/shpalljet',
    de: '/konto/anzeigen',
    en: '/dashboard/listings',
  },
  '/dashboard/messages': {
    sq: '/paneli/mesazhet',
    de: '/konto/nachrichten',
    en: '/dashboard/messages',
  },
  '/dashboard/statistics': {
    sq: '/paneli/statistikat',
    de: '/konto/statistik',
    en: '/dashboard/statistics',
  },
  '/dashboard/verification': {
    sq: '/paneli/verifikimi',
    de: '/konto/verifizierung',
    en: '/dashboard/verification',
  },
  '/dashboard/settings': {
    sq: '/paneli/cilesimet',
    de: '/konto/einstellungen',
    en: '/dashboard/settings',
  },

  '/pricing': { sq: '/cmimet', de: '/preise', en: '/pricing' },

  // Rechtliches. Die Pfade sind uebersetzt, damit ein Besucher sieht, worauf
  // er klickt — ein Acquirer prueft diese Seiten vor der Freischaltung.
  '/terms': { sq: '/kushtet', de: '/agb', en: '/terms' },
  '/withdrawal': { sq: '/terheqja', de: '/widerruf', en: '/withdrawal' },
  '/privacy': { sq: '/privatesia', de: '/datenschutz', en: '/privacy' },
  '/cookies': { sq: '/cookies', de: '/cookies', en: '/cookies' },
  '/imprint': { sq: '/impressum', de: '/impressum', en: '/imprint' },
  '/contact': { sq: '/kontakti', de: '/kontakt', en: '/contact' },

  // Fehlermeldungen ueber die Seite selbst -- nicht zu verwechseln mit dem
  // Melden eines einzelnen Inserats, das auf dem Inserat sitzt.
  '/report-bug': { sq: '/raporto-gabim', de: '/fehler-melden', en: '/report-bug' },
  '/dashboard/billing': {
    sq: '/paneli/pagesat',
    de: '/konto/zahlungen',
    en: '/dashboard/billing',
  },
  /** Bezahlseite des Mock-Anbieters. Bei Stripe liegt sie beim Anbieter. */
  '/checkout/[id]': {
    sq: '/pagesa/[id]',
    de: '/bezahlen/[id]',
    en: '/checkout/[id]',
  },

  '/login': { sq: '/hyr', de: '/anmelden', en: '/login' },
  '/register': { sq: '/regjistrohu', de: '/registrieren', en: '/register' },
  '/forgot-password': {
    sq: '/harrova-fjalekalimin',
    de: '/passwort-vergessen',
    en: '/forgot-password',
  },
  '/reset-password': {
    sq: '/rivendos-fjalekalimin',
    de: '/passwort-zuruecksetzen',
    en: '/reset-password',
  },

  // Der Admin-Bereich ist intern und bleibt in allen Sprachen englisch.
  '/admin': '/admin',
  '/admin/users': '/admin/users',
  '/admin/users/[id]': '/admin/users/[id]',
  '/admin/vehicles': '/admin/vehicles',
  '/admin/dealers': '/admin/dealers',
  '/admin/verifications': '/admin/verifications',
  '/admin/reports': '/admin/reports',
  '/admin/bugs': '/admin/bugs',
  '/admin/brands': '/admin/brands',
  '/admin/models': '/admin/models',
  '/admin/categories': '/admin/categories',
  '/admin/packages': '/admin/packages',
  '/admin/payments': '/admin/payments',
  '/admin/settings': '/admin/settings',
} as const;

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
