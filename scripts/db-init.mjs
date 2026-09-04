/**
 * Richtet einmalig das lokale PostgreSQL-Datenverzeichnis ein und legt die
 * Datenbanken leviz und leviz_shadow an. Danach genuegt "npm run db:start".
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const BASE = path.join(ROOT, '.postgres');
const DATA_DIR = path.join(BASE, 'data');
const PW_FILE = path.join(BASE, 'pwfile');
const LOG_FILE = path.join(BASE, 'server.log');
const PORT = 5433;
const USER = 'leviz';
const PASSWORD = 'leviz_dev';

const exe = (name) => path.join(
  ROOT, 'node_modules', '@embedded-postgres', 'windows-x64', 'native', 'bin',
  process.platform === 'win32' ? `${name}.exe` : name,
);

if (existsSync(DATA_DIR)) {
  console.log('  Datenverzeichnis besteht bereits. Nichts zu tun.');
  console.log('  Komplett neu aufsetzen: Ordner .postgres loeschen und erneut ausfuehren.');
  process.exit(0);
}

mkdirSync(BASE, { recursive: true });
writeFileSync(PW_FILE, PASSWORD);

console.log('  Initialisiere PostgreSQL-Cluster ...');
const init = spawnSync(exe('initdb'), [
  '-D', DATA_DIR,
  '-U', USER,
  `--pwfile=${PW_FILE}`,
  '-E', 'UTF8',
  '--locale=C',
  '--auth-host=scram-sha-256',
  '--auth-local=scram-sha-256',
], { stdio: 'inherit' });

// Das Passwort steht jetzt im Cluster; die Klartextdatei wird nicht mehr gebraucht.
rmSync(PW_FILE, { force: true });

if (init.status !== 0) {
  console.error('\n  initdb fehlgeschlagen.\n');
  process.exit(1);
}

console.log(`  Starte Server auf Port ${PORT} ...`);
spawnSync(exe('pg_ctl'), ['-D', DATA_DIR, '-o', `-p ${PORT}`, '-l', LOG_FILE, 'start'], {
  stdio: 'inherit',
});

console.log('\n  Fertig. Naechste Schritte:');
console.log('    npm run db:migrate');
console.log('    npm run db:seed\n');
