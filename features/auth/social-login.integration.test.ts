// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { prisma } from '@/lib/db';

import { loginWithSocialIdentity } from './social-login';

/**
 * Der Kern hinter /api/v1/auth/social gegen die echte Datenbank: erstes Mal
 * anlegen, zweites Mal wiederfinden, belegte Adresse abweisen, gesperrtes
 * Konto abweisen. Laeuft nur, wenn die Datenbank erreichbar ist.
 */
const EMAILS = ['social-neu@leviz.invalid', 'social-passwort@leviz.invalid', 'social-gesperrt@leviz.invalid'];

let datenbank = false;

async function aufraeumen() {
  await prisma.user.deleteMany({ where: { email: { in: EMAILS } } });
}

beforeAll(async () => {
  try {
    await prisma.user.count();
    datenbank = true;
  } catch {
    datenbank = false;
    return;
  }
  await aufraeumen();
});

afterAll(async () => {
  if (datenbank) await aufraeumen();
});

describe('loginWithSocialIdentity', () => {
  it('legt beim ersten Mal Konto, Profil und Anbieterkonto an', async () => {
    if (!datenbank) return;

    const ergebnis = await loginWithSocialIdentity(
      { provider: 'google', subject: 'g-1001', email: 'social-neu@leviz.invalid', emailVerified: true },
      { name: 'Arben Krasniqi', locale: 'sq' },
    );
    expect(ergebnis).toMatchObject({ ok: true, created: true });
    if (!ergebnis.ok) return;

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: ergebnis.userId },
      select: { name: true, emailVerified: true, passwordHash: true, locale: true, profile: true, accounts: true },
    });
    expect(user.name).toBe('Arben Krasniqi');
    expect(user.emailVerified).not.toBeNull();
    expect(user.passwordHash).toBeNull();
    expect(user.locale).toBe('sq');
    expect(user.profile).not.toBeNull();
    expect(user.accounts).toMatchObject([{ provider: 'google', providerAccountId: 'g-1001', type: 'oidc' }]);
  });

  it('findet dasselbe Konto beim zweiten Mal ueber die Kennung, nicht die Adresse', async () => {
    if (!datenbank) return;

    // Apple "E-Mail verbergen" kann die Adresse wechseln lassen; die Kennung
    // bleibt. Deshalb zaehlt sie, und die Adresse ist Beiwerk.
    const ergebnis = await loginWithSocialIdentity(
      { provider: 'google', subject: 'g-1001', email: 'ganz-andere@leviz.invalid', emailVerified: true },
      { name: null, locale: 'de' },
    );
    const bestehend = await prisma.user.findUniqueOrThrow({ where: { email: 'social-neu@leviz.invalid' }, select: { id: true } });
    expect(ergebnis).toEqual({ ok: true, userId: bestehend.id, created: false });
  });

  it('verschmilzt nicht mit einem Passwortkonto derselben Adresse', async () => {
    if (!datenbank) return;

    await prisma.user.create({
      data: { email: 'social-passwort@leviz.invalid', passwordHash: 'x', name: 'Passwort', profile: { create: {} } },
    });

    const ergebnis = await loginWithSocialIdentity(
      { provider: 'apple', subject: '001234.abc', email: 'social-passwort@leviz.invalid', emailVerified: true },
      { name: null, locale: 'sq' },
    );
    expect(ergebnis).toEqual({ ok: false, reason: 'account-exists' });
    // Und es ist kein Anbieterkonto entstanden, das beim naechsten Mal doch hineinliesse.
    expect(await prisma.account.count({ where: { provider: 'apple', providerAccountId: '001234.abc' } })).toBe(0);
  });

  it('laesst ein gesperrtes Konto nicht hinein', async () => {
    if (!datenbank) return;

    const angelegt = await loginWithSocialIdentity(
      { provider: 'apple', subject: '009999.gesperrt', email: 'social-gesperrt@leviz.invalid', emailVerified: true },
      { name: 'Gesperrt', locale: 'sq' },
    );
    expect(angelegt.ok).toBe(true);
    await prisma.user.update({ where: { email: 'social-gesperrt@leviz.invalid' }, data: { status: 'SUSPENDED' } });

    const wieder = await loginWithSocialIdentity(
      { provider: 'apple', subject: '009999.gesperrt', email: 'social-gesperrt@leviz.invalid', emailVerified: true },
      { name: null, locale: 'sq' },
    );
    expect(wieder).toEqual({ ok: false, reason: 'account-suspended' });
  });

  it('nennt das Konto wie seine Adresse, wenn der Anbieter keinen Namen schickt', async () => {
    if (!datenbank) return;

    await prisma.user.deleteMany({ where: { email: 'social-neu@leviz.invalid' } });
    const ergebnis = await loginWithSocialIdentity(
      { provider: 'apple', subject: '007.ohne-namen', email: 'social-neu@leviz.invalid', emailVerified: false },
      { name: '  ', locale: 'en' },
    );
    expect(ergebnis.ok).toBe(true);
    const user = await prisma.user.findUniqueOrThrow({ where: { email: 'social-neu@leviz.invalid' }, select: { name: true, emailVerified: true } });
    expect(user.name).toBe('social-neu@leviz.invalid');
    expect(user.emailVerified).toBeNull();
  });
});
