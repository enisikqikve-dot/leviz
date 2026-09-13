import { fail, ok, type ActionResult } from '@/lib/action-result';
import { RATE_LIMITS, rateLimiter } from '@/lib/rate-limit';
import { buildImageKey, getStorage } from '@/lib/storage';
import {
  MAX_IMAGE_BYTES, validateImage, type ValidationError,
} from '@/lib/storage/validate';

/**
 * Fotos entgegennehmen -- ein Weg fuer Website und App.
 *
 * Geprueft wird der tatsaechliche Inhalt, nicht der gemeldete Typ:
 * Dateiendung und MIME-Angabe sind frei waehlbar und taugen nicht als
 * Schutz. Die Datei landet unter einem zufaelligen Namen im Ordner des
 * Nutzers, damit sich verwaiste Uploads eindeutig zuordnen und aufraeumen
 * lassen.
 */
export type UploadedImage = { key: string; url: string };

/** Fehlermeldungen zu den Prüfungen aus lib/storage/validate. */
export const UPLOAD_MESSAGES: Record<ValidationError, string> = {
  empty: 'Datei ist leer',
  tooLarge: `Datei ist größer als ${Math.round(MAX_IMAGE_BYTES / 1024 / 1024)} MB`,
  unsupportedFormat: 'Nur JPG, PNG, WebP oder AVIF',
  heicNotSupported: 'HEIC vom iPhone wird nicht unterstützt — bitte als JPG exportieren',
};

/** 120 Uploads je Fenster und Nutzer -- ein Inserat hat hoechstens 30 Fotos. */
export async function withinUploadLimit(userId: string): Promise<boolean> {
  const limit = await rateLimiter.check(
    `upload:${userId}`,
    120,
    RATE_LIMITS.contactSeller.windowMs,
  );
  return limit.success;
}

export async function storeVehicleImage(
  userId: string,
  bytes: Uint8Array,
): Promise<ActionResult<UploadedImage>> {
  if (bytes.byteLength > MAX_IMAGE_BYTES) return fail(UPLOAD_MESSAGES.tooLarge);

  const result = validateImage(bytes);
  if (!result.ok) return fail(UPLOAD_MESSAGES[result.error]);

  const stored = await getStorage().put({
    key: buildImageKey(userId, result.format),
    body: bytes,
    contentType: result.mime,
  });

  return ok({ key: stored.key, url: stored.url });
}

/** Entfernt ein zuvor hochgeladenes Bild wieder -- nur eigene. */
export async function removeVehicleImage(userId: string, key: string): Promise<ActionResult> {
  // Der Pfad beginnt mit der Nutzerkennung; alles andere gehoert jemand anderem.
  if (!key.startsWith(`vehicles/${userId}/`)) {
    return fail('Kein Zugriff auf diese Datei');
  }

  await getStorage().remove(key);
  return ok();
}
