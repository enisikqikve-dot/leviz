import { prisma } from '@/lib/db';

import { verifyPassword } from './password';

/**
 * Anmeldung mit E-Mail und Passwort -- ein Weg fuer Website und App.
 *
 * Vorher lag diese Pruefung im Anmelde-Anbieter von Auth.js. Die App kann
 * den nicht benutzen, sie hat keine Cookies. Eine zweite Fassung fuer die API
 * waere die Stelle, an der beide nach einem halben Jahr verschieden streng
 * sind. Deshalb steht die Pruefung hier, und beide rufen sie.
 *
 * Gibt bei jedem Mangel `null` zurueck -- unbekannte Adresse, falsches
 * Passwort, gesperrtes Konto. Bewusst ohne Unterscheidung: eine Anmeldeseite,
 * die "diese Adresse gibt es nicht" sagt, verraet, wer ein Konto hat.
 */

/**
 * Ein Argon2id-Wert, gegen den verglichen wird, wenn es das Konto nicht gibt
 * oder es kein Passwort hat (OAuth). Der Vergleich dauert dann genauso lange
 * wie ein echter -- sonst verriete die Antwortzeit, ob die Adresse bekannt
 * ist.
 */
const PLATZHALTER =
  '$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHR2YWx1ZQ$0000000000000000000000000000000000000000000';

export type PasswordLoginResult = {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
  role: 'USER' | 'PRIVATE_SELLER' | 'DEALER' | 'ADMIN' | 'SUPER_ADMIN';
  status: 'ACTIVE' | 'SUSPENDED' | 'DELETED';
  dealerId: string | null;
};

export async function authenticateWithPassword(
  email: string,
  password: string,
): Promise<PasswordLoginResult | null> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      role: true,
      status: true,
      passwordHash: true,
      dealer: { select: { id: true } },
    },
  });

  if (!user?.passwordHash) {
    await verifyPassword(PLATZHALTER, password);
    return null;
  }

  const valid = await verifyPassword(user.passwordHash, password);
  if (!valid) return null;
  if (user.status !== 'ACTIVE') return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    role: user.role,
    status: user.status,
    dealerId: user.dealer?.id ?? null,
  };
}
