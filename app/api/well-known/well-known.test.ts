import { afterEach, describe, expect, it, vi } from 'vitest';

import { GET as aasa } from './apple-app-site-association/route';
import { GET as assetlinks } from './assetlinks/route';

/**
 * Die Vertrauensdateien fuer iOS und Android: ohne Einrichtung ehrlich 404,
 * mit Einrichtung genau das Format, das Apple und Google pruefen.
 */
afterEach(() => vi.unstubAllEnvs());

describe('apple-app-site-association', () => {
  it('liefert 404 ohne Team-ID -- keine halbe Datei, die Apple zwischenspeichert', async () => {
    vi.stubEnv('APPLE_TEAM_ID', '');
    const antwort = aasa();
    expect(antwort.status).toBe(404);
    expect(await antwort.json()).toMatchObject({ error: 'not-configured' });
  });

  it('traegt App-ID und Pfade, wenn die Team-ID gesetzt ist', async () => {
    vi.stubEnv('APPLE_TEAM_ID', 'ABCDE12345');
    const antwort = aasa();
    expect(antwort.status).toBe(200);
    expect(antwort.headers.get('content-type')).toContain('application/json');

    const json = await antwort.json();
    expect(json.applinks.details[0].appIDs).toEqual(['ABCDE12345.com.levizz.app']);
    expect(json.applinks.details[0].components.at(-1)).toEqual({ '/': '/*' });
    expect(json.applinks.details[0].components.some((c: { exclude?: boolean }) => c.exclude)).toBe(true);
    expect(json.webcredentials.apps).toEqual(['ABCDE12345.com.levizz.app']);
  });
});

describe('assetlinks.json', () => {
  it('liefert 404 ohne Fingerabdruck', async () => {
    vi.stubEnv('ANDROID_CERT_SHA256', '');
    expect(assetlinks().status).toBe(404);
  });

  it('nimmt mehrere Fingerabdruecke, kommagetrennt, und schreibt sie gross', async () => {
    vi.stubEnv('ANDROID_CERT_SHA256', 'aa:bb:cc, DD:EE:FF');
    const antwort = assetlinks();
    expect(antwort.status).toBe(200);
    const json = await antwort.json();
    expect(json[0].relation).toEqual(['delegate_permission/common.handle_all_urls']);
    expect(json[0].target).toEqual({
      namespace: 'android_app',
      package_name: 'com.levizz.app',
      sha256_cert_fingerprints: ['AA:BB:CC', 'DD:EE:FF'],
    });
  });
});
