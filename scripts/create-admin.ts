/**
 * Legt ein Verwalterkonto an oder hebt ein bestehendes Konto auf SUPER_ADMIN.
 *
 * Warum ein eigenes Skript und nicht der Seed: der Seed liegt im Repository und
 * wandert damit auf GitHub. Ein echtes Passwort haette dort nichts zu suchen —
 * auch nicht in einem privaten Repository, denn ein einmal eingecheckter Wert
 * bleibt in der Historie stehen. Dieses Skript nimmt das Passwort entgegen,
 * verwahrt es nirgends und schreibt nur den Argon2-Hash in die Datenbank.
 *
 * Aufruf:
 *   npm run admin:create -- <email> ["Voller Name"]
 *
 * Das Passwort kommt, in dieser Reihenfolge:
 *   1. aus der Umgebungsvariablen LEVIZ_ADMIN_PASSWORD,
 *   2. aus der Standardeingabe, falls hineingeleitet wird,
 *   3. sonst aus einer verdeckten Eingabeaufforderung.
 *
 * Achtung: "npm run db:seed" raeumt die Tabelle user komplett ab. Nach jedem
 * Seed-Lauf muss dieses Skript erneut laufen.
 */
import 'dotenv/config';

import { createInterface } from 'node:readline';
import process from 'node:process';

import { emailSchema, passwordSchema } from '../features/auth/schemas.js';
import { hashPassword } from '../lib/auth/password.js';
import { prisma } from '../lib/db/index.js';

function fail(message: string): never {
  console.error(`\n  ${message}\n`);
  process.exit(1);
}

/** Liest die Standardeingabe vollstaendig, wenn etwas hineingeleitet wurde. */
async function readPiped(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString('utf8').replace(/\r?\n$/, '');
}

/**
 * Fragt ein Passwort ab, ohne es anzuzeigen. Ohne diese Stummschaltung stuende
 * es sichtbar im Terminal und danach in dessen Rueckblaetterspeicher.
 */
function askHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    (rl as unknown as { _writeToOutput: (text: string) => void })._writeToOutput = () => {};

    process.stdout.write(question);
    rl.question('', (answer) => {
      process.stdout.write('\n');
      rl.close();
      resolve(answer);
    });
  });
}

async function collectPassword(): Promise<string> {
  const fromEnv = process.env.LEVIZ_ADMIN_PASSWORD;
  if (fromEnv) return fromEnv;

  if (!process.stdin.isTTY) return readPiped();

  const first = await askHidden('  Passwort:      ');
  const second = await askHidden('  Wiederholen:   ');

  if (first !== second) fail('Die beiden Eingaben stimmen nicht ueberein.');
  return first;
}

async function main() {
  const [rawEmail, rawName] = process.argv.slice(2);

  if (!rawEmail) {
    fail('Aufruf: npm run admin:create -- <email> ["Voller Name"]');
  }

  // Dieselben Regeln wie bei der Registrierung. Ein Verwalterkonto darf nicht
  // schwaecher geschuetzt sein als ein gewoehnliches.
  const email = emailSchema.safeParse(rawEmail);
  if (!email.success) fail(email.error.issues[0].message);

  const password = passwordSchema.safeParse(await collectPassword());
  if (!password.success) fail(password.error.issues[0].message);

  const name = rawName?.trim() || email.data.split('@')[0];
  const passwordHash = await hashPassword(password.data);

  const existing = await prisma.user.findUnique({
    where: { email: email.data },
    select: { id: true, role: true },
  });

  const user = await prisma.user.upsert({
    where: { email: email.data },
    create: {
      email: email.data,
      emailVerified: new Date(),
      name,
      passwordHash,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      locale: 'sq',
      trustScore: 100,
    },
    // Ein bestehendes Konto behaelt seine Inserate und Nachrichten; nur Rolle,
    // Passwort und Sperrstatus werden gesetzt.
    update: {
      name,
      passwordHash,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      suspendedAt: null,
      suspendedReason: null,
      emailVerified: new Date(),
    },
    select: { id: true, email: true, name: true, role: true },
  });

  // Ohne Profil fehlen dem Konto Wohnort und Benachrichtigungseinstellungen.
  await prisma.profile.upsert({
    where: { userId: user.id },
    create: { userId: user.id },
    update: {},
  });

  console.log('');
  console.log(`  ${existing ? 'Konto aktualisiert' : 'Konto angelegt'}: ${user.email}`);
  console.log(`  Name:          ${user.name}`);
  console.log(`  Rolle:         ${user.role}`);
  if (existing && existing.role !== 'SUPER_ADMIN') {
    console.log(`  Vorher:        ${existing.role}`);
  }
  console.log('');
  console.log('  Anmelden unter /hyr, Verwaltung unter /admin.');
  console.log('  Nach "npm run db:seed" dieses Skript erneut ausfuehren.');
  console.log('');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
