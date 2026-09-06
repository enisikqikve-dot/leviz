import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Readable } from 'node:stream';

import { resolveUpload } from '@/lib/storage/serve';

/**
 * Liefert die hochgeladenen Fahrzeugfotos aus.
 *
 * Warum es diese Route braucht, obwohl die Dateien unter `public/uploads`
 * liegen und damit eigentlich von selbst erreichbar waeren: Next liest das
 * Verzeichnis `public` im Betrieb genau einmal beim Start ein und beantwortet
 * danach nur noch Anfragen zu Dateien aus dieser Liste
 * (node_modules/next/dist/server/lib/router-utils/filesystem.js, Zweig
 * `if (!opts.dev)`). Alles, was ein Verkaeufer spaeter hochlaedt, steht nicht
 * darin — die Anfrage faellt durch bis zur 404-Seite.
 *
 * Ohne diese Route sind die Fotos jedes neu angelegten Inserats unsichtbar,
 * bis jemand den Server neu startet. In der Entwicklung faellt das nie auf:
 * dort wird das Verzeichnis bei jeder Anfrage neu gelesen.
 */
export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const { key } = await params;

  const resolved = resolveUpload(key);
  if (!resolved) return new Response(null, { status: 404 });

  let size: number;
  try {
    const info = await stat(resolved.filePath);
    if (!info.isFile()) return new Response(null, { status: 404 });
    size = info.size;
  } catch {
    return new Response(null, { status: 404 });
  }

  const body = Readable.toWeb(
    createReadStream(resolved.filePath),
  ) as unknown as ReadableStream<Uint8Array>;

  return new Response(body, {
    headers: {
      'Content-Type': resolved.contentType,
      'Content-Length': String(size),
      // Der Dateiname traegt einen Zufallsanteil: dieselbe Adresse zeigt nie
      // auf ein anderes Bild. Der Browser darf sie dauerhaft behalten.
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
