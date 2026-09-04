'use server';

import { fail, ok, type ActionResult } from '@/lib/action-result';
import { requireUser } from '@/lib/auth/guards';
import { RATE_LIMITS, rateLimiter } from '@/lib/rate-limit';
import { buildImageKey, getStorage } from '@/lib/storage';
import {
  MAX_IMAGE_BYTES, validateImage, type ValidationError,
} from '@/lib/storage/validate';

export type UploadedImage = { key: string; url: string };

/** Fehlermeldungen zu den Prüfungen aus lib/storage/validate. */
const MESSAGES: Record<ValidationError, string> = {
  empty: 'Datei ist leer',
  tooLarge: `Datei ist größer als ${Math.round(MAX_IMAGE_BYTES / 1024 / 1024)} MB`,
  unsupportedFormat: 'Nur JPG, PNG, WebP oder AVIF',
  heicNotSupported: 'HEIC vom iPhone wird nicht unterstützt — bitte als JPG exportieren',
};

/**
 * Nimmt ein Bild entgegen und legt es im Dateispeicher ab.
 *
 * Geprüft wird der tatsächliche Inhalt, nicht der vom Browser gemeldete Typ:
 * Dateiendung und MIME-Angabe sind frei wählbar und taugen nicht als Schutz.
 */
export async function uploadVehicleImageAction(
  formData: FormData,
): Promise<ActionResult<UploadedImage>> {
  const user = await requireUser();

  const limit = await rateLimiter.check(
    `upload:${user.id}`,
    120,
    RATE_LIMITS.contactSeller.windowMs,
  );
  if (!limit.success) return fail('Zu viele Uploads. Bitte kurz warten.');

  const file = formData.get('file');
  if (!(file instanceof File)) return fail('Keine Datei empfangen');
  if (file.size > MAX_IMAGE_BYTES) return fail(MESSAGES.tooLarge);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const result = validateImage(bytes);

  if (!result.ok) return fail(MESSAGES[result.error]);

  const storage = getStorage();
  const stored = await storage.put({
    // Der Ordner trägt die Nutzerkennung, damit sich verwaiste Uploads
    // eindeutig zuordnen und aufräumen lassen.
    key: buildImageKey(user.id, result.format),
    body: bytes,
    contentType: result.mime,
  });

  return ok({ key: stored.key, url: stored.url });
}

/** Entfernt ein zuvor hochgeladenes Bild wieder. */
export async function deleteVehicleImageAction(key: string): Promise<ActionResult> {
  const user = await requireUser();

  // Nur eigene Uploads. Der Pfad beginnt mit der Nutzerkennung.
  if (!key.startsWith(`vehicles/${user.id}/`)) {
    return fail('Kein Zugriff auf diese Datei');
  }

  await getStorage().remove(key);
  return ok();
}
