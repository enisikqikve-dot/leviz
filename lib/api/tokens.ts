import { createHash, hkdfSync, randomBytes } from 'node:crypto';

import { jwtVerify, SignJWT } from 'jose';

import type { UserRole, UserStatus } from '@/lib/generated/prisma/enums';

/**
 * Die beiden Token der App-Anmeldung.
 *
 * Zugriffs-Token: ein signiertes JWT mit kurzer Laufzeit. Es steht in jeder
 * Anfrage und wird ohne Datenbankzugriff geprueft -- deshalb tragen Rolle und
 * Sperrstatus darin mit. Was sich waehrend seiner Laufzeit aendert, greift
 * erst beim naechsten Erneuern; die Laufzeit ist kurz genug, dass das tragbar
 * ist.
 *
 * Erneuerungs-Token: ein zufaelliger Wert ohne Struktur. Er steht in der
 * Datenbank nur als Pruefsumme und wird bei jeder Verwendung ersetzt. Alles
 * dazu in `lib/api/sessions.ts`.
 *
 * Der Schluessel wird aus AUTH_SECRET abgeleitet, nicht direkt uebernommen:
 * Auth.js signiert seine Cookies mit demselben Geheimnis. Ein abgeleiteter
 * Schluessel sorgt dafuer, dass ein Cookie-JWT hier niemals als Zugriffs-Token
 * durchgeht -- auch dann nicht, wenn jemand die Pruefung falsch verdrahtet.
 */

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_DAYS = 30;

const ISSUER = 'levizz.com';
const AUDIENCE = 'leviz-app';

export type AccessClaims = {
  sub: string;
  role: UserRole;
  status: UserStatus;
  dealerId: string | null;
};

function schluessel(secret: string): Uint8Array {
  return new Uint8Array(hkdfSync('sha256', secret, 'leviz-api', 'access-token', 32));
}

export async function signAccessToken(
  claims: AccessClaims,
  secret: string,
  now: Date = new Date(),
): Promise<string> {
  const ausgestellt = Math.floor(now.getTime() / 1000);

  return new SignJWT({ role: claims.role, status: claims.status, dealerId: claims.dealerId })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(claims.sub)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt(ausgestellt)
    .setExpirationTime(ausgestellt + ACCESS_TOKEN_TTL_SECONDS)
    .sign(schluessel(secret));
}

/** `null` bei jedem Mangel -- abgelaufen, falsch signiert, fremder Zweck. */
export async function verifyAccessToken(
  token: string,
  secret: string,
): Promise<AccessClaims | null> {
  try {
    const { payload } = await jwtVerify(token, schluessel(secret), {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ['HS256'],
    });

    if (typeof payload.sub !== 'string') return null;
    if (typeof payload.role !== 'string' || typeof payload.status !== 'string') return null;

    return {
      sub: payload.sub,
      role: payload.role as UserRole,
      status: payload.status as UserStatus,
      dealerId: typeof payload.dealerId === 'string' ? payload.dealerId : null,
    };
  } catch {
    return null;
  }
}

/** Ein neues Erneuerungs-Token samt der Pruefsumme, die gespeichert wird. */
export function createRefreshToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('base64url');
  return { token, hash: hashRefreshToken(token) };
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function refreshExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + REFRESH_TOKEN_TTL_DAYS * 86_400_000);
}
