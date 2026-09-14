/**
 * Erzeugt das Client-Geheimnis fuer "Mit Apple anmelden" (AUTH_APPLE_SECRET).
 *
 * Apple gibt kein festes Geheimnis heraus, sondern verlangt ein selbst
 * signiertes JWT, das hoechstens sechs Monate gilt. Dieses Skript baut es aus
 * dem Schluessel des Entwicklerkontos -- siehe README, "Anmeldung ueber
 * Google, Apple und GitHub".
 *
 * Aufruf:
 *   npm run auth:apple-secret -- --team ABCDE12345 --key-id XYZ9876543 \
 *     --client-id com.levizz.web --p8 ./AuthKey_XYZ9876543.p8
 *
 * Das Geheimnis wird nur ausgegeben, nirgends gespeichert. Die .p8-Datei
 * gehoert nicht ins Repository; .gitignore schliesst *.p8 aus.
 */
import { readFileSync } from 'node:fs';
import process from 'node:process';
import { parseArgs } from 'node:util';

import { APPLE_SECRET_MAX_AGE, appleClientSecret } from '../lib/auth/apple-secret.js';

function fail(message: string): never {
  console.error(`\n  ${message}\n`);
  process.exit(1);
}

const { values } = parseArgs({
  options: {
    team: { type: 'string' },
    'key-id': { type: 'string' },
    'client-id': { type: 'string' },
    p8: { type: 'string' },
    /** Gueltigkeit in Tagen; Vorgabe ist Apples Hoechstmass. */
    days: { type: 'string' },
  },
});

const teamId = values.team ?? process.env.APPLE_TEAM_ID;
const keyId = values['key-id'];
const clientId = values['client-id'] ?? process.env.AUTH_APPLE_ID;
const p8 = values.p8;

if (!teamId || !keyId || !clientId || !p8) {
  fail(
    'Aufruf: npm run auth:apple-secret -- --team <Team ID> --key-id <Key ID> --client-id <Services ID> --p8 <AuthKey.p8>\n' +
      '  Team ID und Services ID koennen auch aus APPLE_TEAM_ID und AUTH_APPLE_ID kommen.',
  );
}

let privateKey: string;
try {
  privateKey = readFileSync(p8, 'utf8');
} catch {
  fail(`Schluesseldatei nicht lesbar: ${p8}`);
}

const maxAge = values.days ? Number(values.days) * 24 * 60 * 60 : APPLE_SECRET_MAX_AGE;

try {
  const { secret, expiresAt } = appleClientSecret({ teamId, keyId, clientId, privateKey, maxAge });

  console.log(`\n  AUTH_APPLE_ID="${clientId}"`);
  console.log(`  AUTH_APPLE_SECRET="${secret}"`);
  console.log(`\n  Gueltig bis ${expiresAt.toISOString().slice(0, 10)} -- vorher neu erzeugen und auf dem Server eintragen.\n`);
} catch (fehler) {
  fail(fehler instanceof Error ? fehler.message : String(fehler));
}
