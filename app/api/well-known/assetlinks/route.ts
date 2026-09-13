import { NextResponse } from 'next/server';

/**
 * https://levizz.com/.well-known/assetlinks.json
 *
 * Das Gegenstueck fuer Android (App Links): Google prueft beim Installieren,
 * dass die Website der App vertraut. Gebraucht wird der SHA-256-Fingerabdruck
 * des Signierschluessels -- bei Play App Signing steht er in der Play Console
 * unter "App-Signatur", bei EAS unter `eas credentials`. Mehrere Werte
 * (Debug, Release) kommagetrennt.
 */
export const dynamic = 'force-static';

export function GET(): NextResponse {
  const fingerabdruecke = (process.env.ANDROID_CERT_SHA256 ?? '')
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  if (fingerabdruecke.length === 0) {
    return NextResponse.json({ error: 'not-configured', hint: 'ANDROID_CERT_SHA256 setzen' }, { status: 404 });
  }

  return NextResponse.json(
    [
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: 'com.levizz.app',
          sha256_cert_fingerprints: fingerabdruecke,
        },
      },
    ],
    { headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=3600' } },
  );
}
