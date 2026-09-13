import { forbidden, unauthorized } from './respond';
import { verifyAccessToken, type AccessClaims } from './tokens';

/**
 * Wer ruft an?
 *
 * Gelesen wird `Authorization: Bearer <token>`. Geprueft wird ohne Datenbank
 * -- deshalb tragen Rolle und Sperrstatus im Token mit und gelten fuer seine
 * kurze Laufzeit. Eine Sperre greift also spaetestens nach fuenfzehn Minuten;
 * dieselbe Verzoegerung hat die Website mit ihrem Cookie.
 */
export type ApiUser = {
  id: string;
  role: AccessClaims['role'];
  status: AccessClaims['status'];
  dealerId: string | null;
};

export async function getApiUser(request: Request): Promise<ApiUser | null> {
  const kopf = request.headers.get('authorization') ?? '';
  const [schema, token] = kopf.split(' ');
  if (schema?.toLowerCase() !== 'bearer' || !token) return null;

  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;

  const claims = await verifyAccessToken(token, secret);
  if (!claims) return null;

  return { id: claims.sub, role: claims.role, status: claims.status, dealerId: claims.dealerId };
}

export async function requireApiUser(request: Request): Promise<ApiUser> {
  const user = await getApiUser(request);
  if (!user) throw unauthorized();
  if (user.status !== 'ACTIVE') throw forbidden('account-suspended');
  return user;
}

export async function requireApiDealer(request: Request): Promise<ApiUser & { dealerId: string }> {
  const user = await requireApiUser(request);
  if (!user.dealerId) throw forbidden('dealer-only');
  return user as ApiUser & { dealerId: string };
}
