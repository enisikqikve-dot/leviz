import { createRemoteJWKSet, errors, jwtVerify, type JWTVerifyGetKey } from 'jose';

/**
 * Anmeldung aus der App mit Google- oder Apple-Konto.
 *
 * Auf der Website fuehrt Auth.js den Nutzer zum Anbieter und zurueck. Die App
 * kann das nicht: sie hat keine Cookies und keinen Rueckruf. Stattdessen
 * spricht das Telefon selbst mit Google beziehungsweise Apple (die
 * Anmeldedialoge des Systems) und bekommt ein ID-Token -- ein signiertes JWT,
 * das sagt: "Dieser Nutzer hat sich gerade bei uns ausgewiesen." Das schickt
 * die App an /api/v1/auth/social, und hier wird es geprueft.
 *
 * Geprueft wird alles, was ein gefaelschtes oder fremdes Token verraten
 * wuerde:
 *  - die Signatur gegen die oeffentlichen Schluessel des Anbieters (JWKS),
 *  - der Aussteller (`iss`),
 *  - der Empfaenger (`aud`): das Token muss fuer LEVIZ ausgestellt sein, nicht
 *    fuer irgendeine andere App -- sonst koennte jede App, der ein Nutzer
 *    sich mit Google gezeigt hat, mit dessen Token bei LEVIZ hinein,
 *  - die Gueltigkeit (`exp`).
 *
 * Die Schluessel holt `jose` von den Anbietern und haelt sie im Speicher;
 * Tests reichen einen eigenen Schluesselsatz herein.
 */

/** Anbieter, die die App nativ anbietet -- GitHub gibt es nur auf der Website. */
export type NativeProvider = 'google' | 'apple';

export type SocialIdentity = {
  provider: NativeProvider;
  /** Die stabile Kennung beim Anbieter (`sub`) -- nie die E-Mail. */
  subject: string;
  email: string;
  emailVerified: boolean;
};

const ANBIETER: Record<NativeProvider, { jwks: string; issuer: string | string[] }> = {
  google: {
    jwks: 'https://www.googleapis.com/oauth2/v3/certs',
    // Google stellt beide Schreibweisen aus, je nach Bibliothek.
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
  },
  apple: {
    jwks: 'https://appleid.apple.com/auth/keys',
    issuer: 'https://appleid.apple.com',
  },
};

const schluessel = new Map<NativeProvider, JWTVerifyGetKey>();

function schluesselFuer(provider: NativeProvider): JWTVerifyGetKey {
  let keys = schluessel.get(provider);
  if (!keys) {
    keys = createRemoteJWKSet(new URL(ANBIETER[provider].jwks));
    schluessel.set(provider, keys);
  }
  return keys;
}

export class InvalidIdToken extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidIdToken';
  }
}

/**
 * Prueft ein ID-Token und gibt zurueck, wen es ausweist.
 *
 * `audience` sind die Kennungen, unter denen LEVIZ beim Anbieter bekannt ist
 * (Google: die Web-Client-ID, Apple: die Bundle-ID der App). Wirft
 * InvalidIdToken bei jedem Mangel -- die Route macht daraus 401.
 */
export async function verifyIdToken(
  provider: NativeProvider,
  token: string,
  audience: string[],
  keys: JWTVerifyGetKey = schluesselFuer(provider),
): Promise<SocialIdentity> {
  if (audience.length === 0) throw new InvalidIdToken(`${provider}: kein Empfaenger eingerichtet`);

  let payload;
  try {
    ({ payload } = await jwtVerify(token, keys, {
      issuer: ANBIETER[provider].issuer,
      audience,
      // Beide Anbieter signieren mit RS256; alles andere waere ein Angriff.
      algorithms: ['RS256'],
      // Telefonuhren gehen vor oder nach; eine Minute Spiel schadet nicht.
      clockTolerance: 60,
    }));
  } catch (fehler) {
    // Im Protokoll soll stehen, was fehlte -- der Anrufer bekommt nur 401.
    const grund =
      fehler instanceof errors.JWTClaimValidationFailed
        ? `${fehler.code} (${fehler.claim})`
        : fehler instanceof errors.JOSEError
          ? fehler.code
          : 'unlesbar';
    throw new InvalidIdToken(`${provider}: ${grund}`);
  }

  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  if (!payload.sub || !email) throw new InvalidIdToken(`${provider}: ohne Kennung oder E-Mail`);

  // Apple liefert `email_verified` je nach Weg als Wahrheitswert oder als
  // Zeichenkette "true"; Google als Wahrheitswert.
  const verified = payload.email_verified === true || payload.email_verified === 'true';

  return { provider, subject: payload.sub, email, emailVerified: verified };
}
