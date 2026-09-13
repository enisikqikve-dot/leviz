import { RATE_LIMITS, rateLimiter } from '@/lib/rate-limit';

import { tooMany } from './respond';

/**
 * Absenderadresse einer API-Anfrage -- nur zum Begrenzen der Versuchsrate.
 *
 * Die Kopfzeilen sind faelschbar und taugen nicht zur Autorisierung. Hinter
 * Caddy steht die echte Adresse in X-Forwarded-For.
 */
export function requestIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return request.headers.get('x-real-ip') ?? '127.0.0.1';
}

/** Wirft 429, wenn der Eimer voll ist. Dieselben Grenzen wie die Website. */
export async function enforceLimit(
  bucket: keyof typeof RATE_LIMITS,
  key: string,
): Promise<void> {
  const { limit, windowMs } = RATE_LIMITS[bucket];
  const result = await rateLimiter.check(`api:${bucket}:${key}`, limit, windowMs);
  if (!result.success) throw tooMany();
}
