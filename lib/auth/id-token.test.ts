import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWTVerifyGetKey } from 'jose';
import { beforeAll, describe, expect, it } from 'vitest';

import { InvalidIdToken, verifyIdToken } from './id-token';

/**
 * Ein Schluesselpaar wie bei Google oder Apple, nur lokal: der oeffentliche
 * Teil als JWKS, der private zum Signieren der Test-Tokens.
 */
let keys: JWTVerifyGetKey;
let fremdeKeys: JWTVerifyGetKey;
let signieren: (claims: Record<string, unknown>, opts?: { issuer?: string; audience?: string; alg?: string; expiresIn?: string }) => Promise<string>;
let fremdSignieren: (claims: Record<string, unknown>) => Promise<string>;

beforeAll(async () => {
  const eigen = await generateKeyPair('RS256');
  const fremd = await generateKeyPair('RS256');
  keys = createLocalJWKSet({ keys: [{ ...(await exportJWK(eigen.publicKey)), kid: 'k1', alg: 'RS256', use: 'sig' }] });
  fremdeKeys = createLocalJWKSet({ keys: [{ ...(await exportJWK(fremd.publicKey)), kid: 'k2', alg: 'RS256', use: 'sig' }] });

  signieren = (claims, opts = {}) =>
    new SignJWT(claims)
      .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
      .setIssuer(opts.issuer ?? 'https://accounts.google.com')
      .setAudience(opts.audience ?? 'leviz-web.apps.googleusercontent.com')
      .setIssuedAt()
      .setExpirationTime(opts.expiresIn ?? '1h')
      .sign(eigen.privateKey);

  fremdSignieren = (claims) =>
    new SignJWT(claims)
      .setProtectedHeader({ alg: 'RS256', kid: 'k2' })
      .setIssuer('https://accounts.google.com')
      .setAudience('leviz-web.apps.googleusercontent.com')
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(fremd.privateKey);
});

const AUD = ['leviz-web.apps.googleusercontent.com'];

describe('verifyIdToken', () => {
  it('weist einen Google-Nutzer aus', async () => {
    const token = await signieren({ sub: '1029384756', email: 'Arben@Gmail.com', email_verified: true, name: 'Arben' });

    await expect(verifyIdToken('google', token, AUD, keys)).resolves.toEqual({
      provider: 'google',
      subject: '1029384756',
      // Klein und ohne Rand: so steht die Adresse auch beim Passwortkonto.
      email: 'arben@gmail.com',
      emailVerified: true,
    });
  });

  it('nimmt Googles zweite Schreibweise des Ausstellers', async () => {
    const token = await signieren({ sub: '1', email: 'a@b.c', email_verified: true }, { issuer: 'accounts.google.com' });
    await expect(verifyIdToken('google', token, AUD, keys)).resolves.toMatchObject({ subject: '1' });
  });

  it('versteht Apples "true" als Zeichenkette', async () => {
    const token = await signieren(
      { sub: '001234.abcdef', email: 'xyz@privaterelay.appleid.com', email_verified: 'true', is_private_email: 'true' },
      { issuer: 'https://appleid.apple.com', audience: 'com.levizz.app' },
    );

    await expect(verifyIdToken('apple', token, ['com.levizz.app'], keys)).resolves.toEqual({
      provider: 'apple',
      subject: '001234.abcdef',
      email: 'xyz@privaterelay.appleid.com',
      emailVerified: true,
    });
  });

  it('weist ein Token fuer eine andere App ab', async () => {
    // Der entscheidende Fall: ein Token, das sich ein Nutzer bei einer
    // fremden App geholt hat, darf bei LEVIZ nichts oeffnen.
    const token = await signieren({ sub: '1', email: 'a@b.c' }, { audience: 'andere-app.apps.googleusercontent.com' });
    await expect(verifyIdToken('google', token, AUD, keys)).rejects.toThrow(InvalidIdToken);
  });

  it('weist ein Token vom falschen Aussteller ab', async () => {
    const token = await signieren({ sub: '1', email: 'a@b.c' }, { issuer: 'https://appleid.apple.com' });
    await expect(verifyIdToken('google', token, AUD, keys)).rejects.toThrow(/iss/i);
  });

  it('weist ein abgelaufenes Token ab', async () => {
    const token = await signieren({ sub: '1', email: 'a@b.c' }, { expiresIn: '-2m' });
    await expect(verifyIdToken('google', token, AUD, keys)).rejects.toThrow(/exp/i);
  });

  it('weist eine fremde Signatur ab', async () => {
    const token = await fremdSignieren({ sub: '1', email: 'a@b.c' });
    await expect(verifyIdToken('google', token, AUD, keys)).rejects.toThrow(InvalidIdToken);
  });

  it('weist ein Token ohne E-Mail ab', async () => {
    // Ohne Adresse liesse sich das Konto weder anlegen noch wiederfinden.
    const token = await signieren({ sub: '1' });
    await expect(verifyIdToken('google', token, AUD, keys)).rejects.toThrow(/E-Mail/);
  });

  it('weist alles ab, wenn kein Empfaenger eingerichtet ist', async () => {
    // AUTH_GOOGLE_ID fehlt: lieber gar keine Anmeldung als eine ohne Pruefung.
    const token = await signieren({ sub: '1', email: 'a@b.c' });
    await expect(verifyIdToken('google', token, [], keys)).rejects.toThrow(/Empfaenger/);
  });

  it('nimmt Unsinn nicht einmal auseinander', async () => {
    await expect(verifyIdToken('google', 'kein.jwt', AUD, keys)).rejects.toThrow(InvalidIdToken);
    await expect(verifyIdToken('apple', '', ['com.levizz.app'], fremdeKeys)).rejects.toThrow(InvalidIdToken);
  });
});
