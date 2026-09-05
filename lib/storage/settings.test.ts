import { describe, expect, it } from 'vitest';

import { buildImageKey, readS3Settings } from './index';

const vollstaendig = {
  STORAGE_ENDPOINT: 'https://konto.r2.cloudflarestorage.com',
  STORAGE_BUCKET: 'leviz',
  STORAGE_ACCESS_KEY: 'schluessel',
  STORAGE_SECRET_KEY: 'geheim',
  STORAGE_PUBLIC_URL: 'https://bilder.leviz.example',
};

describe('readS3Settings', () => {
  it('nimmt eine vollstaendige Konfiguration an', () => {
    const result = readS3Settings(vollstaendig);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.settings.bucket).toBe('leviz');
      expect(result.settings.publicUrl).toBe('https://bilder.leviz.example');
    }
  });

  it('nennt jede fehlende Angabe beim Namen', () => {
    // Eine Fehlermeldung, die nur "falsch konfiguriert" sagt, kostet beim
    // Einrichten eine halbe Stunde.
    const result = readS3Settings({
      ...vollstaendig,
      STORAGE_BUCKET: undefined,
      STORAGE_SECRET_KEY: '',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.missing).toEqual(['STORAGE_BUCKET', 'STORAGE_SECRET_KEY']);
    }
  });

  it('setzt die Region auf auto, wenn keine angegeben ist', () => {
    // Cloudflare R2 kennt nur "auto"; bei Amazon steht dort die echte Region.
    const result = readS3Settings(vollstaendig);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.settings.region).toBe('auto');
  });

  it('uebernimmt eine ausdruecklich gesetzte Region', () => {
    const result = readS3Settings({ ...vollstaendig, STORAGE_REGION: 'eu-central-1' });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.settings.region).toBe('eu-central-1');
  });
});

describe('buildImageKey', () => {
  it('legt Bilder unter ihrem Fahrzeug ab', () => {
    // Der Fahrzeugbezug im Pfad erlaubt spaeter, alle Bilder eines Inserats
    // gesammelt zu loeschen.
    expect(buildImageKey('fahrzeug123', 'jpeg')).toMatch(/^vehicles\/fahrzeug123\//);
  });

  it('haengt die zum Format passende Endung an', () => {
    expect(buildImageKey('x', 'jpeg')).toMatch(/\.jpg$/);
    expect(buildImageKey('x', 'png')).toMatch(/\.png$/);
    expect(buildImageKey('x', 'webp')).toMatch(/\.webp$/);
    expect(buildImageKey('x', 'avif')).toMatch(/\.avif$/);
  });

  it('vergibt nie zweimal denselben Schluessel', () => {
    // Sonst ueberschriebe ein Upload das Bild eines anderen Verkaeufers.
    const keys = new Set(
      Array.from({ length: 500 }, () => buildImageKey('gleiches-fahrzeug', 'jpeg')),
    );

    expect(keys.size).toBe(500);
  });

  it('uebernimmt nichts aus dem Originalnamen', () => {
    // Der Dateiname des Nutzers taucht im Pfad nicht auf: er koennte Umlaute,
    // Schraegstriche oder den Klarnamen des Verkaeufers enthalten.
    const key = buildImageKey('fahrzeug123', 'jpeg');
    expect(key.split('/')).toHaveLength(3);
    expect(key).toMatch(/^vehicles\/fahrzeug123\/[a-z0-9]+-[a-f0-9]{16}\.jpg$/);
  });
});
