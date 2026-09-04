import { randomBytes } from 'node:crypto';

/**
 * Umschrift der Sonderzeichen, die in Marken-, Modell- und Ortsnamen des
 * Zielmarkts vorkommen. Ohne sie wuerde aus Prishtinë ein Prishtin und aus
 * Skoda ein kaputter Pfad.
 */
const TRANSLITERATION: Record<string, string> = {
  ë: 'e', Ë: 'e', ç: 'c', Ç: 'c',
  ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss',
  Ä: 'ae', Ö: 'oe', Ü: 'ue',
  á: 'a', à: 'a', â: 'a', å: 'a',
  é: 'e', è: 'e', ê: 'e',
  í: 'i', ì: 'i', î: 'i',
  ó: 'o', ò: 'o', ô: 'o', õ: 'o',
  ú: 'u', ù: 'u', û: 'u',
  š: 's', Š: 's', ž: 'z', Ž: 'z', č: 'c', Č: 'c',
  ć: 'c', Ć: 'c', đ: 'd', Đ: 'd', ñ: 'n',
};

export function slugify(input: string): string {
  return input
    .split('')
    .map((char) => TRANSLITERATION[char] ?? char)
    .join('')
    .toLowerCase()
    .normalize('NFD')
    // Verbliebene Akzentzeichen entfernen.
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
}

/** Zeichen ohne 0/O und 1/I, damit ein vorgelesener Code eindeutig bleibt. */
const CODE_ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz';

export function generatePublicCode(length = 6): string {
  const bytes = randomBytes(length);
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return code;
}

export type VehicleSlugParts = {
  brand: string;
  model: string;
  variant?: string | null;
  year?: number | null;
  city?: string | null;
  publicCode: string;
};

/**
 * Sprechende Adresse mit stabilem Kurzcode am Ende, etwa
 * bmw-320d-xdrive-2021-prishtine-a7f3k2. Der Titel darf sich spaeter aendern,
 * ohne dass der Link bricht — der Code bleibt.
 */
export function buildVehicleSlug(parts: VehicleSlugParts): string {
  const segments = [
    parts.brand,
    parts.model,
    parts.variant ?? '',
    parts.year ? String(parts.year) : '',
    parts.city ?? '',
  ]
    .map((segment) => slugify(segment))
    .filter(Boolean);

  return `${segments.join('-').slice(0, 90)}-${parts.publicCode}`;
}

/** Liest den Kurzcode aus einer Adresse, etwa fuer Weiterleitungen. */
export function publicCodeFromSlug(slug: string): string | null {
  const match = slug.match(/-([a-z0-9]{6})$/);
  return match ? match[1] : null;
}
