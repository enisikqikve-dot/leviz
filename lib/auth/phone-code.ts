import { createHash, randomInt } from 'node:crypto';

import { prisma } from '@/lib/db';

const CODE_TTL_MS = 10 * 60_000;
const MAX_ATTEMPTS = 5;

/**
 * Es wird nur der Hash gespeichert. Wer die Datenbank liest, kommt damit an
 * keinen gueltigen Code. SHA-256 genuegt hier, weil der Code kurzlebig ist und
 * die Versuche begrenzt sind.
 */
function hashCode(phone: string, code: string): string {
  return createHash('sha256').update(`${phone}:${code}`).digest('hex');
}

export function generatePhoneCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

/** Legt einen neuen Code an und entwertet alle vorherigen fuer diese Nummer. */
export async function issuePhoneCode(phone: string): Promise<string> {
  const code = generatePhoneCode();

  await prisma.$transaction([
    prisma.phoneVerification.updateMany({
      where: { phone, consumedAt: null },
      data: { consumedAt: new Date() },
    }),
    prisma.phoneVerification.create({
      data: {
        phone,
        codeHash: hashCode(phone, code),
        expiresAt: new Date(Date.now() + CODE_TTL_MS),
      },
    }),
  ]);

  return code;
}

/**
 * Prueft den Code und verbraucht ihn bei Erfolg. Ein Code gilt genau einmal;
 * zu viele Fehlversuche entwerten ihn ebenfalls.
 */
export async function consumePhoneCode(phone: string, code: string): Promise<boolean> {
  const record = await prisma.phoneVerification.findFirst({
    where: { phone, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });

  if (!record) return false;

  if (record.attempts >= MAX_ATTEMPTS) {
    await prisma.phoneVerification.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    });
    return false;
  }

  if (record.codeHash !== hashCode(phone, code)) {
    await prisma.phoneVerification.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    return false;
  }

  await prisma.phoneVerification.update({
    where: { id: record.id },
    data: { consumedAt: new Date() },
  });

  return true;
}
