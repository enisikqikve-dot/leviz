/**
 * Schutz davor, erfundene Inserate in eine echte Datenbank zu schreiben.
 *
 * Der Seed legt 242 Fahrzeuge und 20 Autohäuser an, die es nicht gibt. In der
 * Entwicklung ist das genau richtig — im Betrieb wäre es eine Täuschung:
 * Besucher sähen Angebote, die niemand verkauft, und Händler, die niemand
 * anrufen kann. Vorher löscht der Seed ausserdem den gesamten Bestand.
 *
 * Deshalb entscheidet nicht NODE_ENV, sondern die Adresse der Datenbank. Eine
 * Umgebungsvariable kann beim Entwickeln falsch gesetzt sein; die Adresse sagt,
 * wohin tatsächlich geschrieben wird.
 */

/** Rechnernamen, hinter denen nur eine Entwicklungsdatenbank stehen kann. */
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]', 'host.docker.internal']);

/**
 * Zeigt die Verbindung auf den eigenen Rechner?
 *
 * Eine Adresse, die sich nicht lesen lässt, gilt als nicht lokal. Im Zweifel
 * lieber abbrechen als eine fremde Datenbank leeren.
 */
export function isLocalDatabase(url: string | undefined): boolean {
  if (!url) return false;

  try {
    return LOCAL_HOSTS.has(new URL(url).hostname);
  } catch {
    return false;
  }
}

/** Name der Variablen, mit der sich der Schutz bewusst aufheben lässt. */
export const OVERRIDE = 'LEVIZ_SEED_ALLOW_REMOTE';

export type GuardResult = { allowed: true } | { allowed: false; reason: string };

/**
 * Entscheidet, ob erfundene Inhalte geschrieben werden dürfen. Der echte
 * Katalog — Marken, Modelle, Städte, Pakete — fällt nicht darunter: das sind
 * keine erfundenen Angebote, sondern Nachschlagewerte, die jede Installation
 * braucht.
 */
export function mayWriteDemoContent(
  env: Record<string, string | undefined>,
): GuardResult {
  const url = env.DATABASE_URL;

  if (isLocalDatabase(url)) return { allowed: true };

  if (env[OVERRIDE] === '1') return { allowed: true };

  const host = safeHost(url);

  return {
    allowed: false,
    reason:
      `DATABASE_URL zeigt auf ${host}, nicht auf den eigenen Rechner.\n\n` +
      '  Der Seed legt 242 erfundene Fahrzeuge und 20 erfundene Autohäuser an\n' +
      '  und löscht vorher alles, was in der Datenbank steht.\n\n' +
      '  Für eine echte Installation stattdessen nur den Katalog einspielen:\n' +
      '    npm run db:catalog\n\n' +
      `  Wenn die Beispieldaten wirklich dorthin sollen:\n` +
      `    ${OVERRIDE}=1 npm run db:seed`,
  };
}

function safeHost(url: string | undefined): string {
  if (!url) return '(keine DATABASE_URL gesetzt)';
  try {
    return new URL(url).hostname;
  } catch {
    return '(unlesbare Adresse)';
  }
}
