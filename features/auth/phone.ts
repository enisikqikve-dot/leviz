/**
 * Telefonnummern der Kernmaerkte. Nutzer tippen sie sehr unterschiedlich
 * (044 123 456, +383 44 123 456, 0038344123456), gespeichert wird aber immer
 * die internationale Schreibweise ohne Leerzeichen.
 */
export const PHONE_COUNTRIES = [
  { code: 'XK', prefix: '+383', trunk: '0', nationalLength: [8, 9] },
  { code: 'AL', prefix: '+355', trunk: '0', nationalLength: [9] },
  { code: 'MK', prefix: '+389', trunk: '0', nationalLength: [8] },
] as const;

export type PhoneCountryCode = (typeof PHONE_COUNTRIES)[number]['code'];

/**
 * Bringt eine Eingabe in die Form +383XXXXXXXX. Gibt `null` zurueck, wenn die
 * Nummer zu keinem der unterstuetzten Laender passt.
 */
export function normalizePhone(
  input: string,
  defaultCountry: PhoneCountryCode = 'XK',
): string | null {
  const cleaned = input.replace(/[\s\-().]/g, '');
  if (cleaned === '') return null;

  // 0038344... in +38344... umschreiben.
  const withPlus = cleaned.startsWith('00') ? `+${cleaned.slice(2)}` : cleaned;

  if (withPlus.startsWith('+')) {
    const match = PHONE_COUNTRIES.find((c) => withPlus.startsWith(c.prefix));
    if (!match) return null;

    const national = withPlus.slice(match.prefix.length).replace(/^0+/, '');
    if (!/^\d+$/.test(national)) return null;
    if (!(match.nationalLength as readonly number[]).includes(national.length)) return null;

    return `${match.prefix}${national}`;
  }

  if (!/^\d+$/.test(withPlus)) return null;

  const country = PHONE_COUNTRIES.find((c) => c.code === defaultCountry);
  if (!country) return null;

  const national = withPlus.replace(/^0+/, '');
  if (!(country.nationalLength as readonly number[]).includes(national.length)) return null;

  return `${country.prefix}${national}`;
}

/** Bricht eine gespeicherte Nummer fuer die Anzeige lesbar um. */
export function formatPhone(phone: string): string {
  const match = PHONE_COUNTRIES.find((c) => phone.startsWith(c.prefix));
  if (!match) return phone;

  const national = phone.slice(match.prefix.length);
  const groups = national.replace(/(\d{2})(\d{3})(\d+)/, '$1 $2 $3');
  return `${match.prefix} ${groups}`;
}
