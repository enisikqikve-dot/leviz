import { headers } from 'next/headers';

/**
 * Beste verfuegbare Naeherung der Absenderadresse. Wird nur zur Begrenzung der
 * Versuchsrate genutzt, nie zur Autorisierung — die Kopfzeilen sind faelschbar.
 */
export async function getRequestIp(): Promise<string> {
  const store = await headers();

  const forwarded = store.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }

  return store.get('x-real-ip') ?? '127.0.0.1';
}
