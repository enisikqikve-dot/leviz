import { generateKeyPairSync, verify } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { APPLE_SECRET_MAX_AGE, appleClientSecret } from './apple-secret';

/** Ein Schluessel wie aus Apples .p8-Datei: P-256, als PKCS#8-PEM. */
const { privateKey, publicKey } = generateKeyPairSync('ec', {
  namedCurve: 'prime256v1',
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});

const eingabe = {
  teamId: 'ABCDE12345',
  keyId: 'XYZ9876543',
  clientId: 'com.levizz.web',
  privateKey,
  now: new Date('2026-09-14T10:00:00Z'),
};

function teile(jwt: string) {
  const [header, payload, signature] = jwt.split('.');
  return {
    header: JSON.parse(Buffer.from(header, 'base64url').toString('utf8')),
    payload: JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')),
    signature: Buffer.from(signature, 'base64url'),
    signed: Buffer.from(`${header}.${payload}`),
  };
}

describe('appleClientSecret', () => {
  it('baut das JWT so, wie Apple es verlangt', () => {
    const { secret, expiresAt } = appleClientSecret(eingabe);
    const { header, payload } = teile(secret);

    expect(header).toEqual({ alg: 'ES256', kid: 'XYZ9876543' });
    expect(payload).toEqual({
      iss: 'ABCDE12345',
      iat: 1_789_380_000,
      exp: 1_789_380_000 + APPLE_SECRET_MAX_AGE,
      aud: 'https://appleid.apple.com',
      sub: 'com.levizz.web',
    });
    expect(expiresAt.toISOString()).toBe(new Date((1_789_380_000 + APPLE_SECRET_MAX_AGE) * 1000).toISOString());
  });

  it('signiert mit ES256 im JWT-Format, nicht im DER-Format', () => {
    const { secret } = appleClientSecret(eingabe);
    const { signature, signed } = teile(secret);

    // r und s zu je 32 Byte -- ein DER-kodiertes Ergebnis waere laenger und
    // wuerde von Apple mit invalid_client abgewiesen.
    expect(signature).toHaveLength(64);
    expect(verify('sha256', signed, { key: publicKey, dsaEncoding: 'ieee-p1363' }, signature)).toBe(true);
  });

  it('laesst keine laengere Gueltigkeit zu als Apple', () => {
    expect(() => appleClientSecret({ ...eingabe, maxAge: APPLE_SECRET_MAX_AGE + 1 })).toThrow(/Gueltigkeit/);
    expect(appleClientSecret({ ...eingabe, maxAge: 60 }).expiresAt.toISOString()).toBe('2026-09-14T10:01:00.000Z');
  });

  it('weist vertauschte oder unvollstaendige Kennungen ab', () => {
    // Der haeufigste Fehler: Services ID und Team ID verwechselt.
    expect(() => appleClientSecret({ ...eingabe, teamId: 'com.levizz.web' })).toThrow(/Team ID/);
    expect(() => appleClientSecret({ ...eingabe, keyId: 'xyz' })).toThrow(/Key ID/);
    expect(() => appleClientSecret({ ...eingabe, clientId: '  ' })).toThrow(/Services ID/);
  });

  it('nimmt nur EC-Schluessel', () => {
    const rsa = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      publicKeyEncoding: { type: 'spki', format: 'pem' },
    });
    expect(() => appleClientSecret({ ...eingabe, privateKey: rsa.privateKey })).toThrow(/EC-Schluessel/);
  });
});
