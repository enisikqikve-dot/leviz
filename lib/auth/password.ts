import { hash, verify } from '@node-rs/argon2';

/**
 * Argon2id mit bewusst gesetzten Parametern. Die Werte orientieren sich an der
 * Empfehlung der OWASP-Passwortspeicherung und kosten pro Anmeldung rund
 * 50 Millisekunden — spuerbar fuer Angreifer, unmerklich fuer Nutzer.
 */
const OPTIONS = {
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

export function hashPassword(plain: string): Promise<string> {
  return hash(plain, OPTIONS);
}

export async function verifyPassword(
  storedHash: string,
  plain: string,
): Promise<boolean> {
  try {
    return await verify(storedHash, plain, OPTIONS);
  } catch {
    // Ein beschaedigter oder fremdformatiger Hash gilt als nicht passend,
    // darf aber keine Ausnahme nach aussen tragen.
    return false;
  }
}
