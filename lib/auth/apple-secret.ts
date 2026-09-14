import { createPrivateKey, sign, type KeyObject } from 'node:crypto';

/**
 * Das Client-Geheimnis fuer "Mit Apple anmelden".
 *
 * Apple gibt kein festes Geheimnis heraus. Stattdessen signiert man selbst
 * ein JWT mit dem Schluessel aus dem Entwicklerkonto (die Datei
 * AuthKey_<KEY_ID>.p8) -- und das gilt hoechstens sechs Monate. Danach
 * scheitert jede Apple-Anmeldung mit `invalid_client`, ohne dass sich am
 * Code etwas geaendert haette. Deshalb steht das Ablaufdatum mit im Ergebnis
 * und im README ein Kalendereintrag.
 *
 * Aufbau nach Apples Vorgabe:
 *   Kopf   { alg: ES256, kid: <Key ID> }
 *   Inhalt { iss: <Team ID>, iat, exp, aud: https://appleid.apple.com, sub: <Services ID> }
 *
 * Nur Node-Bordmittel: `crypto.sign` liefert die Signatur mit
 * `dsaEncoding: 'ieee-p1363'` genau in der Form (r‖s), die JWT verlangt.
 */

/** Apples Obergrenze: 15 777 000 Sekunden, etwa ein halbes Jahr. */
export const APPLE_SECRET_MAX_AGE = 15_777_000;

const APPLE_AUDIENCE = 'https://appleid.apple.com';

/** Team-Kennung und Schluessel-Kennung sind bei Apple zehn Grossbuchstaben oder Ziffern. */
const APPLE_ID_FORM = /^[A-Z0-9]{10}$/;

export type AppleSecretInput = {
  /** Team ID, oben rechts im Entwicklerkonto. */
  teamId: string;
  /** Key ID des Schluessels mit "Sign in with Apple". */
  keyId: string;
  /** Die Services ID -- das ist der `AUTH_APPLE_ID` der Website. */
  clientId: string;
  /** Inhalt der .p8-Datei (PEM) oder ein bereits geladener Schluessel. */
  privateKey: string | KeyObject;
  now?: Date;
  /** Gueltigkeit in Sekunden, hoechstens APPLE_SECRET_MAX_AGE. */
  maxAge?: number;
};

export type AppleSecret = {
  secret: string;
  expiresAt: Date;
};

function base64url(value: string | Buffer): string {
  return Buffer.from(value).toString('base64url');
}

export function appleClientSecret(input: AppleSecretInput): AppleSecret {
  const { teamId, keyId, clientId, now = new Date(), maxAge = APPLE_SECRET_MAX_AGE } = input;

  if (!APPLE_ID_FORM.test(teamId)) throw new Error(`Team ID hat nicht die erwartete Form: "${teamId}"`);
  if (!APPLE_ID_FORM.test(keyId)) throw new Error(`Key ID hat nicht die erwartete Form: "${keyId}"`);
  if (!clientId.trim()) throw new Error('Services ID fehlt');
  if (!Number.isInteger(maxAge) || maxAge <= 0 || maxAge > APPLE_SECRET_MAX_AGE) {
    throw new Error(`Gueltigkeit muss zwischen 1 und ${APPLE_SECRET_MAX_AGE} Sekunden liegen`);
  }

  const key = typeof input.privateKey === 'string' ? createPrivateKey(input.privateKey) : input.privateKey;
  if (key.asymmetricKeyType !== 'ec') {
    throw new Error('Der Schluessel ist kein EC-Schluessel -- erwartet wird die .p8-Datei von Apple');
  }

  const iat = Math.floor(now.getTime() / 1000);
  const exp = iat + maxAge;

  const header = base64url(JSON.stringify({ alg: 'ES256', kid: keyId }));
  const payload = base64url(
    JSON.stringify({ iss: teamId, iat, exp, aud: APPLE_AUDIENCE, sub: clientId.trim() }),
  );
  const signature = sign('sha256', Buffer.from(`${header}.${payload}`), {
    key,
    dsaEncoding: 'ieee-p1363',
  });

  return {
    secret: `${header}.${payload}.${base64url(signature)}`,
    expiresAt: new Date(exp * 1000),
  };
}
