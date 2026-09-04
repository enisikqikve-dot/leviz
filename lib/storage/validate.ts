export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_IMAGES_PER_LISTING = 30;

export type ImageFormat = 'jpeg' | 'png' | 'webp' | 'avif';

export const ACCEPTED_MIME: Record<ImageFormat, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
};

export const ACCEPT_ATTRIBUTE = Object.values(ACCEPTED_MIME).join(',');

export type ValidationError =
  | 'empty'
  | 'tooLarge'
  | 'unsupportedFormat'
  | 'heicNotSupported';

export type ValidationResult =
  | { ok: true; format: ImageFormat; mime: string }
  | { ok: false; error: ValidationError };

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0): boolean =>
  signature.every((value, index) => bytes[offset + index] === value);

const ascii = (bytes: Uint8Array, offset: number, text: string): boolean =>
  [...text].every((char, index) => bytes[offset + index] === char.charCodeAt(0));

/**
 * Erkennt das Bildformat an den ersten Bytes.
 *
 * Der vom Browser gemeldete MIME-Typ und die Dateiendung sind frei wählbar und
 * taugen nicht zur Prüfung — eine umbenannte ausführbare Datei käme sonst als
 * Fahrzeugfoto durch.
 */
export function detectImageFormat(bytes: Uint8Array): ImageFormat | 'heic' | null {
  if (bytes.length < 12) return null;

  // JPEG: FF D8 FF
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'jpeg';

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png';

  // WebP: RIFF ???? WEBP
  if (ascii(bytes, 0, 'RIFF') && ascii(bytes, 8, 'WEBP')) return 'webp';

  // ISO-BMFF: ab Byte 4 steht ftyp, danach die Marke.
  if (ascii(bytes, 4, 'ftyp')) {
    if (ascii(bytes, 8, 'avif') || ascii(bytes, 8, 'avis')) return 'avif';
    // Fotos von iPhones. Browser können sie nicht anzeigen, darum eigener Fall.
    if (ascii(bytes, 8, 'heic') || ascii(bytes, 8, 'heix') || ascii(bytes, 8, 'mif1')) {
      return 'heic';
    }
  }

  return null;
}

export function validateImage(bytes: Uint8Array): ValidationResult {
  if (bytes.length === 0) return { ok: false, error: 'empty' };
  if (bytes.length > MAX_IMAGE_BYTES) return { ok: false, error: 'tooLarge' };

  const format = detectImageFormat(bytes);

  if (format === 'heic') return { ok: false, error: 'heicNotSupported' };
  if (format === null) return { ok: false, error: 'unsupportedFormat' };

  return { ok: true, format, mime: ACCEPTED_MIME[format] };
}
