'use server';

import { fail, type ActionResult } from '@/lib/action-result';
import { requireUser } from '@/lib/auth/guards';
import { MAX_IMAGE_BYTES } from '@/lib/storage/validate';

import {
  removeVehicleImage, storeVehicleImage, UPLOAD_MESSAGES, withinUploadLimit,
  type UploadedImage,
} from './upload-core';

/**
 * Nimmt ein Bild aus dem Assistenten entgegen und legt es im Dateispeicher ab.
 * Die Pruefung des Inhalts macht `upload-core.ts` -- dieselbe wie fuer die App.
 */
export async function uploadVehicleImageAction(
  formData: FormData,
): Promise<ActionResult<UploadedImage>> {
  const user = await requireUser();

  if (!(await withinUploadLimit(user.id))) return fail('Zu viele Uploads. Bitte kurz warten.');

  const file = formData.get('file');
  if (!(file instanceof File)) return fail('Keine Datei empfangen');
  // Vor dem Einlesen pruefen: eine zu grosse Datei soll gar nicht erst in den
  // Speicher wandern.
  if (file.size > MAX_IMAGE_BYTES) return fail(UPLOAD_MESSAGES.tooLarge);

  return storeVehicleImage(user.id, new Uint8Array(await file.arrayBuffer()));
}

/** Entfernt ein zuvor hochgeladenes Bild wieder. */
export async function deleteVehicleImageAction(key: string): Promise<ActionResult> {
  const user = await requireUser();
  return removeVehicleImage(user.id, key);
}
