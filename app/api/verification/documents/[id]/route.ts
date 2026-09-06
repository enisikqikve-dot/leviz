import { getVerificationDocument } from '@/features/verification/queries';
import { getSessionUser } from '@/lib/auth/guards';
import { readDocument } from '@/lib/storage/private-store';

/**
 * Gibt einen Ausweisbeleg heraus — und nur an die Verwaltung.
 *
 * Fahrzeugfotos liegen offen unter ihrer Adresse; das ist ihr Zweck. Ein
 * Ausweis darf das nie sein, deshalb liegt er ausserhalb des öffentlichen
 * Verzeichnisses und kommt ausschliesslich über diese Route heraus.
 *
 * Wer nicht darf, bekommt 404 und nicht 403: eine 403 wäre die Bestätigung,
 * dass es unter dieser Kennung etwas gibt.
 */
export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const viewer = await getSessionUser();

  if (!viewer || (viewer.role !== 'ADMIN' && viewer.role !== 'SUPER_ADMIN')) {
    return new Response(null, { status: 404 });
  }

  const { id } = await params;
  const beleg = await getVerificationDocument(id);

  if (!beleg || beleg.request.documentsPurgedAt) return new Response(null, { status: 404 });

  const bytes = await readDocument(beleg.storageKey);
  if (!bytes) return new Response(null, { status: 404 });

  return new Response(new Uint8Array(bytes), {
    headers: {
      'Content-Type': beleg.contentType,
      'Content-Length': String(bytes.byteLength),
      'Content-Disposition': 'inline',

      // Kein Zwischenspeicher, nirgends. Ein Ausweis hat weder im Browser
      // eines geteilten Rechners noch in einem Zwischenspeicher unterwegs
      // etwas verloren.
      'Cache-Control': 'no-store, private',

      // Die Datei liegt unter derselben Herkunft wie die Anwendung. Ohne
      // diese Sperre könnte ein als Bild getarntes PDF Skripte im Namen von
      // LEVIZ ausführen.
      'Content-Security-Policy': "default-src 'none'; img-src 'self'; object-src 'none'; sandbox",
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
