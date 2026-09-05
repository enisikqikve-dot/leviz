import { randomBytes } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

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

/**
 * Schreibt in einen S3-kompatiblen Speicher — Amazon S3, Cloudflare R2,
 * Backblaze B2 und andere sprechen dasselbe Protokoll.
 *
 * Warum das für den Betrieb nötig ist: auf Vercel und ähnlichen Umgebungen ist
 * das Dateisystem flüchtig. Jede neue Veröffentlichung startet mit einem leeren
 * Verzeichnis, hochgeladene Verkäuferfotos wären danach verschwunden.
 *
 * Die öffentliche Adresse kommt aus STORAGE_PUBLIC_URL, nicht aus dem Endpunkt:
 * bei R2 ist der Endpunkt zum Schreiben ein anderer Rechner als die Domäne,
 * über die Besucher die Bilder laden.
 */
class S3Storage implements StorageProvider {
  readonly name = 's3';

  constructor(
    private readonly client: S3Client,
    private readonly bucket: string,
    private readonly publicUrl: string,
  ) {}

  async put(input: {
    key: string;
    body: Uint8Array;
    contentType: string;
  }): Promise<StoredFile> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
        // Ein Jahr, weil der Schlüssel einen Zufallsanteil trägt: dieselbe
        // Adresse zeigt nie auf ein anderes Bild.
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );

    return {
      key: input.key,
      url: this.urlFor(input.key),
      size: input.body.byteLength,
      contentType: input.contentType,
    };
  }

  async remove(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  urlFor(key: string): string {
    return `${this.publicUrl.replace(/\/+$/, '')}/${key}`;
  }
}

/** Die Angaben, ohne die sich kein S3-Speicher aufbauen lässt. */
export type S3Settings = {
  endpoint: string;
  region: string;
  bucket: string;
  accessKey: string;
  secretKey: string;
  publicUrl: string;
};

/**
 * Liest die S3-Einstellungen aus der Umgebung. Fehlt auch nur eine, ist der
 * Speicher nicht eingerichtet — dann lieber gar nicht starten als Uploads
 * annehmen, die nirgends ankommen.
 */
export function readS3Settings(
  env: Record<string, string | undefined>,
): { ok: true; settings: S3Settings } | { ok: false; missing: string[] } {
  const required = {
    STORAGE_ENDPOINT: env.STORAGE_ENDPOINT,
    STORAGE_BUCKET: env.STORAGE_BUCKET,
    STORAGE_ACCESS_KEY: env.STORAGE_ACCESS_KEY,
    STORAGE_SECRET_KEY: env.STORAGE_SECRET_KEY,
    STORAGE_PUBLIC_URL: env.STORAGE_PUBLIC_URL,
  };

  const missing = Object.entries(required)
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) return { ok: false, missing };

  return {
    ok: true,
    settings: {
      endpoint: required.STORAGE_ENDPOINT!,
      // R2 kennt nur "auto"; bei Amazon steht hier die echte Region.
      region: env.STORAGE_REGION || 'auto',
      bucket: required.STORAGE_BUCKET!,
      accessKey: required.STORAGE_ACCESS_KEY!,
      secretKey: required.STORAGE_SECRET_KEY!,
      publicUrl: required.STORAGE_PUBLIC_URL!,
    },
  };
}

let provider: StorageProvider | undefined;

/**
 * Wählt den Speicher anhand von STORAGE_DRIVER. Ohne Konfiguration wird lokal
 * geschrieben, damit die Anwendung ohne Zugangsschlüssel voll benutzbar ist.
 */
export function getStorage(): StorageProvider {
  if (provider) return provider;

  const driver = process.env.STORAGE_DRIVER ?? 'local';

  if (driver === 's3') {
    const result = readS3Settings(process.env);

    if (!result.ok) {
      // Lautstark scheitern: ein stiller Rückfall auf die Festplatte sähe im
      // Betrieb aus wie ein Erfolg und verlöre jedes Bild bei der nächsten
      // Veröffentlichung.
      throw new Error(
        `STORAGE_DRIVER="s3", aber es fehlen: ${result.missing.join(', ')}`,
      );
    }

    const { settings } = result;
    provider = new S3Storage(
      new S3Client({
        region: settings.region,
        endpoint: settings.endpoint,
        credentials: {
          accessKeyId: settings.accessKey,
          secretAccessKey: settings.secretKey,
        },
      }),
      settings.bucket,
      settings.publicUrl,
    );
    return provider;
  }

  provider = new LocalDiskStorage();
  return provider;
}
