import type { Locale } from '@/lib/i18n/routing';

type Template = { subject: string; text: string };

const BRAND = 'LEVIZ';

/** Willkommensnachricht nach der Registrierung. */
export function welcomeEmail(locale: Locale, name: string): Template {
  const byLocale: Record<Locale, Template> = {
    sq: {
      subject: `Mirë se vjen në ${BRAND}`,
      text: `Përshëndetje ${name},\n\nLlogaria jote në ${BRAND} është gati. Tani mund të kërkosh vetura, t'i ruash të preferuarat dhe të publikosh shpalljen tënde falas.\n\nGjej. Krahaso. Lëviz.\n\nEkipi i ${BRAND}`,
    },
    de: {
      subject: `Willkommen bei ${BRAND}`,
      text: `Hallo ${name},\n\ndein ${BRAND}-Konto ist bereit. Du kannst jetzt Fahrzeuge suchen, sie auf die Merkliste setzen und deine eigene Anzeige kostenlos veröffentlichen.\n\nFinden. Vergleichen. Fahren.\n\nDein ${BRAND}-Team`,
    },
    en: {
      subject: `Welcome to ${BRAND}`,
      text: `Hello ${name},\n\nyour ${BRAND} account is ready. You can now search for vehicles, save them, and publish your own listing for free.\n\nFind. Compare. Drive.\n\nThe ${BRAND} team`,
    },
  };

  return byLocale[locale];
}

/** Nachricht mit dem Link zum Zuruecksetzen des Passworts. */
export function passwordResetEmail(locale: Locale, url: string): Template {
  const byLocale: Record<Locale, Template> = {
    sq: {
      subject: `Rivendos fjalëkalimin tënd në ${BRAND}`,
      text: `Ke kërkuar rivendosjen e fjalëkalimit.\n\nHap këtë lidhje brenda një ore:\n${url}\n\nNëse nuk ke qenë ti, thjesht shpërfille këtë mesazh — fjalëkalimi yt mbetet i pandryshuar.\n\nEkipi i ${BRAND}`,
    },
    de: {
      subject: `Passwort zurücksetzen bei ${BRAND}`,
      text: `Du hast das Zurücksetzen deines Passworts angefordert.\n\nÖffne diesen Link innerhalb einer Stunde:\n${url}\n\nWarst du das nicht, ignoriere diese Nachricht einfach — dein Passwort bleibt unverändert.\n\nDein ${BRAND}-Team`,
    },
    en: {
      subject: `Reset your ${BRAND} password`,
      text: `You asked to reset your password.\n\nOpen this link within one hour:\n${url}\n\nIf this was not you, simply ignore this message — your password stays unchanged.\n\nThe ${BRAND} team`,
    },
  };

  return byLocale[locale];
}

/**
 * Meldung an die Verwaltung, wenn sich jemand registriert hat.
 *
 * Bewusst mit Namen, Adresse und Kontoart im Text: eine Meldung, die nur
 * "Es gibt eine neue Registrierung" sagt, zwingt zum Nachschlagen und wird
 * nach der dritten ungelesen weggewischt.
 *
 * Die Sprache richtet sich nach dem Verwalter, der sie bekommt, nicht nach
 * dem, der sich registriert hat.
 */
export function newSignupEmail(
  locale: Locale,
  signup: {
    name: string;
    email: string;
    dealer: string | null;
    url: string;
  },
): Template {
  const art = {
    sq: signup.dealer ? `Autosallon: ${signup.dealer}` : 'Shitës privat',
    de: signup.dealer ? `Händler: ${signup.dealer}` : 'Privatkonto',
    en: signup.dealer ? `Dealer: ${signup.dealer}` : 'Private account',
  } satisfies Record<Locale, string>;

  const byLocale: Record<Locale, Template> = {
    sq: {
      subject: signup.dealer
        ? `Autosallon i ri në ${BRAND}: ${signup.dealer}`
        : `Llogari e re në ${BRAND}: ${signup.name}`,
      text: `Dikush sapo u regjistrua.\n\n${signup.name}\n${signup.email}\n${art.sq}\n\nShiko te ${signup.url}\n\n${BRAND}`,
    },
    de: {
      subject: signup.dealer
        ? `Neuer Händler bei ${BRAND}: ${signup.dealer}`
        : `Neues Konto bei ${BRAND}: ${signup.name}`,
      text: `Es hat sich jemand registriert.\n\n${signup.name}\n${signup.email}\n${art.de}\n\nAnsehen unter ${signup.url}\n\n${BRAND}`,
    },
    en: {
      subject: signup.dealer
        ? `New dealer on ${BRAND}: ${signup.dealer}`
        : `New account on ${BRAND}: ${signup.name}`,
      text: `Someone just signed up.\n\n${signup.name}\n${signup.email}\n${art.en}\n\nOpen ${signup.url}\n\n${BRAND}`,
    },
  };

  return byLocale[locale];
}
