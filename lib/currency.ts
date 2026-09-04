import type { Locale } from '@/lib/i18n/routing';

export const CURRENCIES = ['EUR', 'ALL'] as const;
export type Currency = (typeof CURRENCIES)[number];

export const DEFAULT_CURRENCY: Currency = 'EUR';
export const CURRENCY_COOKIE = 'leviz.currency';

/**
 * Preise werden ausschließlich in Euro-Cent gespeichert. Der Lek-Betrag
 * entsteht erst bei der Anzeige über diesen Kurs, damit es nie zwei Wahrheiten
 * gibt. Ab Phase 8 kommt der Wert aus `PlatformSetting`.
 */
export const FALLBACK_EUR_TO_ALL = 100.5;

/**
 * Zahlenformat je Sprache, bewusst selbst festgelegt statt über Intl.
 *
 * Grund: Node und Chrome liefern unterschiedliche ICU-Stände. Für `sq-AL` gibt
 * Node `29 990 €`, Chrome `€29,990` — und vierstellige Beträge bleiben in
 * beiden ungruppiert (`5500 €`). Auf einem Fahrzeugmarktplatz ist der Preis die
 * wichtigste Zahl der Seite; sie muss überall gleich und immer gruppiert
 * aussehen.
 */
const NUMBER_FORMAT: Record<Locale, { group: string; decimal: string; symbolFirst: boolean }> = {
  sq: { group: '.', decimal: ',', symbolFirst: false },
  de: { group: '.', decimal: ',', symbolFirst: false },
  en: { group: ',', decimal: '.', symbolFirst: true },
};

const SYMBOL: Record<Currency, string> = { EUR: '€', ALL: 'L' };

export function isCurrency(value: unknown): value is Currency {
  return typeof value === 'string' && (CURRENCIES as readonly string[]).includes(value);
}

/** Gruppiert eine nicht negative Ganzzahl in Dreierblöcke. */
export function groupDigits(value: number, separator: string): string {
  const digits = Math.abs(Math.trunc(value)).toString();
  let output = '';

  for (let i = 0; i < digits.length; i += 1) {
    if (i > 0 && (digits.length - i) % 3 === 0) output += separator;
    output += digits[i];
  }

  return value < 0 ? `-${output}` : output;
}

/** Rechnet Euro-Cent in die Anzeigewährung um. Lek wird auf 100 gerundet. */
export function convertFromEurCents(
  eurCents: number,
  currency: Currency,
  eurToAll: number = FALLBACK_EUR_TO_ALL,
): number {
  if (currency === 'EUR') return eurCents / 100;
  return Math.round((eurCents / 100) * eurToAll * 0.01) * 100;
}

export function formatPrice(
  eurCents: number,
  {
    currency = DEFAULT_CURRENCY,
    locale,
    eurToAll = FALLBACK_EUR_TO_ALL,
    withCents = false,
  }: {
    currency?: Currency;
    locale: Locale;
    eurToAll?: number;
    /**
     * Nachkommastellen ausschreiben. Fahrzeugpreise brauchen sie nicht und
     * lesen sich ohne besser. Paketpreise brauchen sie zwingend: aus 9,99 €
     * würde sonst 10 € — ein anderer Preis, als der Betreiber gesetzt hat.
     */
    withCents?: boolean;
  },
): string {
  const exact = convertFromEurCents(eurCents, currency, eurToAll);
  const format = NUMBER_FORMAT[locale];
  const symbol = SYMBOL[currency];

  // Lek wird ohnehin auf volle Hundert gerundet; Cent gibt es dort nicht.
  const hasCents = withCents && currency === 'EUR' && eurCents % 100 !== 0;

  const whole = Math.floor(Math.abs(hasCents ? exact : Math.round(exact)));
  const grouped = groupDigits(whole, format.group);
  const cents = hasCents
    ? format.decimal + String(Math.abs(eurCents) % 100).padStart(2, '0')
    : '';
  const sign = exact < 0 ? '-' : '';

  return format.symbolFirst
    ? `${sign}${symbol}${grouped}${cents}`
    : `${sign}${grouped}${cents} ${symbol}`;
}

export function formatNumber(value: number, locale: Locale): string {
  return groupDigits(value, NUMBER_FORMAT[locale].group);
}

/** Kilometerstand, immer ohne Nachkommastellen. */
export function formatMileage(km: number, locale: Locale): string {
  return `${formatNumber(km, locale)} km`;
}

/** Dezimalzahl mit fester Nachkommastelle, etwa für den Verbrauch. */
export function formatDecimal(value: number, locale: Locale, digits = 1): string {
  const format = NUMBER_FORMAT[locale];
  const [whole, fraction = ''] = Math.abs(value).toFixed(digits).split('.');
  const grouped = groupDigits(Number(whole), format.group);
  const sign = value < 0 ? '-' : '';

  return digits > 0 ? `${sign}${grouped}${format.decimal}${fraction}` : `${sign}${grouped}`;
}
