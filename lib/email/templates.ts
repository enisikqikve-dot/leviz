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
