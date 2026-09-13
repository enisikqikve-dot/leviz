import { z } from 'zod';

import {
  removeVehicleImage, storeVehicleImage, UPLOAD_MESSAGES, withinUploadLimit,
} from '@/features/listings/upload-core';
import { requireApiUser } from '@/lib/api/auth';
import { badRequest, handle, noContent, ok, readJson, tooMany, unwrap } from '@/lib/api/respond';
import { MAX_IMAGE_BYTES } from '@/lib/storage/validate';

/**
 * POST /api/v1/uploads (multipart, Feld `file`) -> { key, url }
 *
 * Ein Foto fuer ein Inserat. Die App verkleinert vorher auf dieselbe Kante
 * wie der Browser (1920 px, JPEG); geprueft wird hier trotzdem der Inhalt
 * ueber die Magic Bytes -- was die App schickt, ist Bequemlichkeit, kein
 * Schutz. Das Ergebnis wandert als {key, url} in die Bilderliste des
 * Inserats; die Reihenfolge dort bestimmt das Hauptbild.
 */
export const POST = handle(async (request) => {
  const user = await requireApiUser(request);

  if (!(await withinUploadLimit(user.id))) throw tooMany();

  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) throw badRequest('no-file', 'Feld "file" fehlt');
  if (file.size > MAX_IMAGE_BYTES) throw badRequest('too-large', UPLOAD_MESSAGES.tooLarge);

  const stored = unwrap(await storeVehicleImage(user.id, new Uint8Array(await file.arrayBuffer())));
  return ok(stored, { status: 201 });
});

/** DELETE /api/v1/uploads { key } -> ein eigenes, noch nicht verwendetes Foto entfernen. */
const loeschSchema = z.object({ key: z.string().min(1).max(200) });

export const DELETE = handle(async (request) => {
  const user = await requireApiUser(request);
  const { key } = loeschSchema.parse(await readJson(request));

  unwrap(await removeVehicleImage(user.id, key));
  return noContent();
});
