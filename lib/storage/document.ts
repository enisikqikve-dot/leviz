import { ACCEPTED_MIME, detectImageFormat, type ValidationError } from './validate';

/**
 * Belege sind Ausweise, Registerauszuege und Rechnungen — kleiner als Fotos
 * von Fahrzeugen, aber ein Registerauszug kann mehrere Seiten haben.
 */
export const MAX_DOCUMENT_BYTES = 8 * 1024 * 1024;

export type DocumentFormat = 'jpeg' | 'png' | 'webp' | 'avif' | 'pdf';

export const DOCUMENT_MIME: Record<DocumentFormat, string> = {
  ...ACCEPTED_MIME,
  pdf: 'application/pdf',
};

export const DOCUMENT_EXTENSION: Record<DocumentFormat, string> = {
  jpeg: 'jpg',
  png: 'png',
  webp: 'webp',
  avif: 'avif',
  pdf: 'pdf',
};

export const DOCUMENT_ACCEPT = Object.values(DOCUMENT_MIME).join(',');

export type DocumentValidation =
  | { ok: true; format: DocumentFormat; mime: string }
  | { ok: false; error: ValidationError };

/**
 * Prueft einen Beleg an seinen ersten Bytes.
 *
 * Wie bei den Fahrzeugfotos zaehlt der Inhalt, nicht die Endung: beides ist
 * frei waehlbar, und hier landet die Datei in einem Speicher, aus dem sie ein
 * Verwalter spaeter im Browser oeffnet.
 *
 * PDF kommt dazu, weil Registerauszuege in der Regel als PDF vorliegen — ein
 * Haendler haette sie sonst erst abfotografieren muessen.
 */
export function validateDocument(bytes: Uint8Array): DocumentValidation {
  if (bytes.length === 0) return { ok: false, error: 'empty' };
  if (bytes.length > MAX_DOCUMENT_BYTES) return { ok: false, error: 'tooLarge' };

  // PDF beginnt mit "%PDF-".
  if (
    bytes.length > 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  ) {
    return { ok: true, format: 'pdf', mime: DOCUMENT_MIME.pdf };
  }

  const format = detectImageFormat(bytes);

  if (format === 'heic') return { ok: false, error: 'heicNotSupported' };
  if (format === null) return { ok: false, error: 'unsupportedFormat' };

  return { ok: true, format, mime: DOCUMENT_MIME[format] };
}
