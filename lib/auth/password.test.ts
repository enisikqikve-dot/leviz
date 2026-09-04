import { describe, expect, it } from 'vitest';

import { hashPassword, verifyPassword } from './password';

describe('Passwort-Hashing', () => {
  it('speichert niemals das Klartextpasswort', async () => {
    const hash = await hashPassword('Fjalekalimi123!');
    expect(hash).not.toContain('Fjalekalimi123!');
    expect(hash.startsWith('$argon2id$')).toBe(true);
  });

  it('erzeugt fuer dasselbe Passwort unterschiedliche Hashes', async () => {
    const [a, b] = await Promise.all([
      hashPassword('Fjalekalimi123!'),
      hashPassword('Fjalekalimi123!'),
    ]);
    expect(a).not.toBe(b);
  });

  it('erkennt das richtige Passwort', async () => {
    const hash = await hashPassword('Fjalekalimi123!');
    await expect(verifyPassword(hash, 'Fjalekalimi123!')).resolves.toBe(true);
  });

  it('weist ein falsches Passwort ab', async () => {
    const hash = await hashPassword('Fjalekalimi123!');
    await expect(verifyPassword(hash, 'fjalekalimi123!')).resolves.toBe(false);
  });

  it('wirft bei einem unbrauchbaren Hash keine Ausnahme', async () => {
    await expect(verifyPassword('kein-gueltiger-hash', 'egal')).resolves.toBe(false);
  });
});
