import { randomBytes } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { ImageFormat } from './validate';

export type StoredFile = {
  /** Pfad innerhalb des Speichers, ohne führenden Schrägstrich. */
  key: string;
  /** Öffentlich erreichbare Adresse. */
  url: string;
  size: number;
  contentType: string;
};

export interface StorageProvider {
  readonly name: string;
  put(input: {
    key: string;
    body: Uint8Array;
    contentType: string;
  }): Promise<StoredFile>;
  remove(key: string): Promise<void>;
  urlFor(key: string): string;
}

const EXTENSION: Record<ImageFormat, string> = {
  jpeg: 'jpg', png: 'png', webp: 'webp', avif: 'avif',
};

/**
 * Erzeugt einen Schlüssel, der weder den Originalnamen noch eine erratbare
 * Reihenfolge enthält. Der Fahrzeugbezug bleibt im Pfad, damit sich Uploads
 * einem Inserat zuordnen und gesammelt löschen lassen.
 */
export function buildImageKey(vehicleId: string, format: ImageFormat): string {
  const token = randomBytes(8).toString('hex');
  return `vehicles/${vehicleId}/${Date.now().toString(36)}-${token}.${EXTENSION[format]}`;
}

/**
 * Schreibt in `public/uploads`. Für die Entwicklung völlig ausreichend und
 * ohne jeden Zugangsschlüssel benutzbar.
 *
 * Für den Betrieb auf mehreren Servern ist das nichts: der Dateispeicher liegt
 * dann auf S3 oder Cloudflare R2. Dafür wird unten ein zweiter Anbieter
 * eingehängt, ohne dass sich für die Aufrufer etwas ändert.
 */
class LocalDiskStorage implements StorageProvider {
  readonly name = 'local';

  private readonly root = path.join(process.cwd(), 'public', 'uploads');

  async put(input: { key: string; body: Uint8Array; contentType: string }): Promise<StoredFile> {
    const target = path.join(this.root, input.key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, input.body);

    return {
      key: input.key,
      url: this.urlFor(input.key),
      size: input.body.byteLength,
      contentType: input.contentType,
    };
  }

  async remove(key: string): Promise<void> {
    try {
      await unlink(path.join(this.root, key));
    } catch {
      // Eine bereits entfernte Datei ist kein Fehler.
    }
  }

  urlFor(key: string): string {
    return `/uploads/${key}`;
  }
}

let provider: StorageProvider | undefined;

/**
 * Wählt den Speicher anhand von STORAGE_DRIVER. Ohne Konfiguration wird lokal
 * geschrieben, damit die Anwendung ohne Zugangsschlüssel voll benutzbar ist.
 *
 * Ein S3-Anbieter wird hier ergänzt, sobald STORAGE_ENDPOINT, STORAGE_BUCKET
 * und die Schlüssel gesetzt sind — siehe .env.example.
 */
export function getStorage(): StorageProvider {
  if (provider) return provider;

  const driver = process.env.STORAGE_DRIVER ?? 'local';

  switch (driver) {
    case 'local':
    default:
      provider = new LocalDiskStorage();
      return provider;
  }
}
