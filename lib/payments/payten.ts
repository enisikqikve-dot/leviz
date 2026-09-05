import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Payten / Nestpay — das Verfahren hinter den Bezahlseiten vieler Banken im
 * Westbalkan und in der Türkei.
 *
 * Zwei Dinge machen es besonders:
 *
 * Der Browser des Käufers schickt das Ergebnis zurück, nicht der Server der
 * Bank. Ohne Prüfsumme könnte also jeder eine erfolgreiche Zahlung behaupten,
 * indem er das Formular selbst abschickt. Die Prüfsumme ist damit nicht eine
 * Formalität, sondern die einzige Absicherung.
 *
 * Die Prüfsumme läuft über *alle* übermittelten Felder. Ein einziges Feld
 * mehr oder weniger, eine andere Reihenfolge, ein nicht maskiertes Zeichen —
 * und sie stimmt nicht. Deshalb liegt sie hier als reine Funktion mit Tests.
 */

/** Zeichen, die den Trenner der Prüfsumme stören, werden maskiert. */
export function escapeValue(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('|', '\\|');
}

/**
 * Bildet die Prüfsumme nach Verfahren „ver3".
 *
 * Alle Felder werden nach ihrem Namen sortiert — ohne Rücksicht auf
 * Groß- und Kleinschreibung, weil die Bank ihre Felder gemischt schreibt
 * (`oid` neben `Response`). Danach die Werte mit `|` verbunden, den
 * Ladenschlüssel angehängt, SHA-512, Base64.
 *
 * `hash` und `encoding` bleiben aussen vor: das eine ist das Ergebnis selbst,
 * das andere nimmt die Bank von der Berechnung aus.
 */
export function buildHash(
  fields: Record<string, string>,
  storeKey: string,
): string {
  const names = Object.keys(fields)
    .filter((name) => {
      const lower = name.toLowerCase();
      return lower !== 'hash' && lower !== 'encoding';
    })
    // Sortierung ohne Sprachabhängigkeit: localeCompare wäre je nach
    // Systemsprache verschieden und die Prüfsumme damit nicht reproduzierbar.
    .sort((a, b) => {
      const left = a.toLowerCase();
      const right = b.toLowerCase();
      return left < right ? -1 : left > right ? 1 : 0;
    });

  const joined = names
    .map((name) => escapeValue(fields[name] ?? ''))
    .concat(escapeValue(storeKey))
    .join('|');

  return createHash('sha512').update(joined, 'utf8').digest('base64');
}

/** Vergleich in konstanter Zeit, damit er nichts über den Schlüssel verrät. */
export function hashMatches(expected: string, received: string): boolean {
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(received, 'utf8');

  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export type PaytenSettings = {
  /** Adresse der Bezahlseite, aus den Unterlagen der Bank. */
  gatewayUrl: string;
  clientId: string;
  storeKey: string;
  /** Meist `3d_pay_hosting`; die Bank nennt den für dich gültigen Wert. */
  storeType: string;
};

/** ISO-4217-Zahl je Währung. Payten erwartet die Zahl, nicht das Kürzel. */
const CURRENCY_CODES: Record<string, string> = {
  EUR: '978',
  ALL: '008',
  USD: '840',
  CHF: '756',
};

export function currencyCode(currency: string): string {
  const code = CURRENCY_CODES[currency.toUpperCase()];
  if (!code) throw new Error(`Payten kennt keine Zahl für die Währung ${currency}`);
  return code;
}

/** Sprachkürzel der Bezahlseite. Unbekanntes fällt auf Englisch zurück. */
export function gatewayLanguage(locale: string): string {
  return ['sq', 'en', 'tr', 'de'].includes(locale) ? locale : 'en';
}

export type PaytenCheckoutInput = {
  paymentId: string;
  amountCents: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
  locale: string;
  /** Zufallswert; als Parameter, damit die Felder prüfbar sind. */
  rnd: string;
};

/**
 * Baut die Formularfelder der Bezahlseite.
 *
 * Der Betrag geht als Dezimalzahl mit Punkt, nicht in Cent: Payten erwartet
 * `9.99`, nicht `999`.
 */
export function buildCheckoutFields(
  settings: PaytenSettings,
  input: PaytenCheckoutInput,
): Record<string, string> {
  const fields: Record<string, string> = {
    clientid: settings.clientId,
    storetype: settings.storeType,
    trantype: 'Auth',
    amount: (input.amountCents / 100).toFixed(2),
    currency: currencyCode(input.currency),
    // Unsere eigene Zahlungskennung. Die Bank reicht sie unverändert zurück
    // und macht damit aus der Antwort eine Zuordnung.
    oid: input.paymentId,
    okUrl: input.successUrl,
    failUrl: input.cancelUrl,
    lang: gatewayLanguage(input.locale),
    rnd: input.rnd,
    hashAlgorithm: 'ver3',
    encoding: 'UTF-8',
  };

  return { ...fields, hash: buildHash(fields, settings.storeKey) };
}

export type PaytenResult = {
  paymentId: string;
  providerPaymentId: string;
  status: 'SUCCEEDED' | 'FAILED';
  failureReason?: string;
};

/**
 * Liest die Antwort der Bezahlseite und prüft ihre Prüfsumme.
 *
 * Gibt `null` zurück, sobald etwas nicht stimmt — dann wird nichts gebucht.
 * Eine fehlende oder falsche Prüfsumme ist der Normalfall eines Angriffs,
 * nicht ein Sonderfall.
 */
export function parseResult(
  fields: Record<string, string>,
  storeKey: string,
): PaytenResult | null {
  const received = fields.HASH ?? fields.hash;
  if (!received) return null;

  if (!hashMatches(buildHash(fields, storeKey), received)) return null;

  const paymentId = fields.oid ?? fields.ReturnOid;
  if (!paymentId) return null;

  // `Response` ist die Entscheidung der Bank. `mdStatus` beschreibt die
  // 3-D-Secure-Prüfung; 1, 2, 3 und 4 gelten dort als bestanden.
  const approved =
    (fields.Response ?? '').toLowerCase() === 'approved' &&
    ['1', '2', '3', '4'].includes(fields.mdStatus ?? '');

  return {
    paymentId,
    providerPaymentId: fields.TransId || fields.AuthCode || `payten_${paymentId}`,
    status: approved ? 'SUCCEEDED' : 'FAILED',
    failureReason: approved
      ? undefined
      : fields.ErrMsg || fields.mdErrorMsg || fields.Response || 'declined',
  };
}
