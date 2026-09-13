import { prisma } from '@/lib/db';

import { unauthorized } from './respond';
import {
  ACCESS_TOKEN_TTL_SECONDS, createRefreshToken, hashRefreshToken, refreshExpiry,
  signAccessToken, type AccessClaims,
} from './tokens';

/**
 * Anmeldungen der App: ausstellen, erneuern, beenden.
 *
 * Das Geheimnis ist AUTH_SECRET -- dasselbe, das die Website benutzt. Fehlt
 * es, scheitert alles laut; einen Ersatz zu erfinden waere eine Anmeldung, die
 * jeder faelschen kann.
 */
function geheimnis(): string {
  const wert = process.env.AUTH_SECRET;
  if (!wert) throw new Error('AUTH_SECRET fehlt -- ohne Geheimnis keine Token');
  return wert;
}

export type IssuedSession = {
  accessToken: string;
  refreshToken: string;
  /** Sekunden, bis das Zugriffs-Token erneuert werden muss. */
  expiresIn: number;
};

type Konto = {
  id: string;
  role: AccessClaims['role'];
  status: AccessClaims['status'];
  dealerId: string | null;
};

async function ladeKonto(userId: string): Promise<Konto | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, status: true, dealer: { select: { id: true } } },
  });
  if (!user) return null;
  return { id: user.id, role: user.role, status: user.status, dealerId: user.dealer?.id ?? null };
}

async function stelleAus(konto: Konto, device: string | null): Promise<IssuedSession> {
  const erneuerung = createRefreshToken();

  await prisma.refreshToken.create({
    data: {
      userId: konto.id,
      tokenHash: erneuerung.hash,
      expiresAt: refreshExpiry(),
      device,
    },
  });

  const accessToken = await signAccessToken(
    { sub: konto.id, role: konto.role, status: konto.status, dealerId: konto.dealerId },
    geheimnis(),
  );

  return { accessToken, refreshToken: erneuerung.token, expiresIn: ACCESS_TOKEN_TTL_SECONDS };
}

/** Nach erfolgreicher Anmeldung oder Registrierung. */
export async function issueSession(userId: string, device: string | null): Promise<IssuedSession> {
  const konto = await ladeKonto(userId);
  if (!konto || konto.status !== 'ACTIVE') throw unauthorized('account-unavailable');
  return stelleAus(konto, device);
}

/**
 * Tauscht ein Erneuerungs-Token gegen ein neues Paar.
 *
 * Das alte Token ist danach verbraucht. Kommt ein verbrauchtes Token ein
 * zweites Mal, ist das kein Versehen: die App haelt immer nur das neueste.
 * Ein zweites Auftauchen heisst, jemand hat es kopiert -- dann werden alle
 * Anmeldungen des Kontos beendet, damit der Dieb nicht laenger drin ist als
 * der Besitzer.
 */
export async function rotateSession(refreshToken: string): Promise<IssuedSession> {
  const hash = hashRefreshToken(refreshToken);

  const eintrag = await prisma.refreshToken.findUnique({
    where: { tokenHash: hash },
    select: { id: true, userId: true, expiresAt: true, revokedAt: true, device: true },
  });

  if (!eintrag) throw unauthorized('refresh-invalid');

  if (eintrag.revokedAt) {
    await prisma.refreshToken.updateMany({
      where: { userId: eintrag.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw unauthorized('refresh-reused');
  }

  if (eintrag.expiresAt < new Date()) throw unauthorized('refresh-expired');

  const konto = await ladeKonto(eintrag.userId);
  if (!konto || konto.status !== 'ACTIVE') throw unauthorized('account-unavailable');

  await prisma.refreshToken.update({
    where: { id: eintrag.id },
    data: { revokedAt: new Date() },
  });

  return stelleAus(konto, eintrag.device);
}

/** Abmelden auf diesem Geraet. Ein unbekanntes Token ist kein Fehler. */
export async function revokeSession(refreshToken: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashRefreshToken(refreshToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
