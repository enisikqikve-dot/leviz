import { describe, expect, it } from 'vitest';

import {
  ACCESS_TOKEN_TTL_SECONDS, createRefreshToken, hashRefreshToken, refreshExpiry,
  signAccessToken, verifyAccessToken,
} from './tokens';

const GEHEIMNIS = 'ein-testgeheimnis-mit-genug-laenge-fuer-hkdf';

const CLAIMS = {
  sub: 'user_1',
  role: 'DEALER' as const,
  status: 'ACTIVE' as const,
  dealerId: 'dealer_1',
};

describe('Zugriffs-Token', () => {
  it('kommt so zurueck, wie es ausgestellt wurde', async () => {
    const token = await signAccessToken(CLAIMS, GEHEIMNIS);
    expect(await verifyAccessToken(token, GEHEIMNIS)).toEqual(CLAIMS);
  });

  it('traegt ein leeres Haendlerfeld als null', async () => {
    const token = await signAccessToken({ ...CLAIMS, dealerId: null }, GEHEIMNIS);
    expect((await verifyAccessToken(token, GEHEIMNIS))?.dealerId).toBeNull();
  });

  it('gilt mit einem anderen Geheimnis nicht', async () => {
    const token = await signAccessToken(CLAIMS, GEHEIMNIS);
    expect(await verifyAccessToken(token, 'ein-anderes-geheimnis-gleicher-laenge')).toBeNull();
  });

  it('gilt nach Ablauf nicht mehr', async () => {
    const vorhin = new Date(Date.now() - (ACCESS_TOKEN_TTL_SECONDS + 60) * 1000);
    const token = await signAccessToken(CLAIMS, GEHEIMNIS, vorhin);
    expect(await verifyAccessToken(token, GEHEIMNIS)).toBeNull();
  });

  it('lehnt eine veraenderte Nutzlast ab', async () => {
    const token = await signAccessToken(CLAIMS, GEHEIMNIS);
    const [kopf, , signatur] = token.split('.');

    // Rolle im Token auf ADMIN drehen, Signatur unveraendert lassen.
    const gefaelscht = Buffer.from(
      JSON.stringify({ ...CLAIMS, role: 'ADMIN', iss: 'levizz.com', aud: 'leviz-app' }),
    ).toString('base64url');

    expect(await verifyAccessToken(`${kopf}.${gefaelscht}.${signatur}`, GEHEIMNIS)).toBeNull();
  });

  it('lehnt Unsinn ab, statt zu werfen', async () => {
    expect(await verifyAccessToken('', GEHEIMNIS)).toBeNull();
    expect(await verifyAccessToken('kein.jwt', GEHEIMNIS)).toBeNull();
  });
});

describe('Erneuerungs-Token', () => {
  it('ist jedes Mal ein anderes', () => {
    const a = createRefreshToken();
    const b = createRefreshToken();
    expect(a.token).not.toBe(b.token);
    expect(a.hash).not.toBe(b.hash);
  });

  it('laesst sich aus dem Token zur Pruefsumme rechnen, aber nicht zurueck', () => {
    const { token, hash } = createRefreshToken();
    expect(hashRefreshToken(token)).toBe(hash);
    // Die Pruefsumme verraet das Token nicht: sie ist ein anderer Wert mit
    // fester Laenge.
    expect(hash).toHaveLength(64);
    expect(hash).not.toContain(token);
  });

  it('laeuft dreissig Tage', () => {
    const jetzt = new Date('2026-09-13T12:00:00Z');
    expect(refreshExpiry(jetzt).toISOString()).toBe('2026-10-13T12:00:00.000Z');
  });
});
