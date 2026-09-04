/**
 * Startet und stoppt das lokale PostgreSQL fuer die Entwicklung.
 *
 * Hintergrund: Das auf diesem Rechner installierte PostgreSQL 17 verlangt ein
 * Passwort, das nicht vorliegt. Statt darauf zu warten, bringt LEVIZ eine
 * eigene, native PostgreSQL-Instanz mit (Paket embedded-postgres) und legt ihr
 * Datenverzeichnis unter .postgres/data ab.
 *
 * Auf ein anderes PostgreSQL umstellen: nur DATABASE_URL in .env aendern.
 * Dieses Skript wird dann nicht mehr gebraucht.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, '.postgres', 'data');
const LOG_FILE = path.join(ROOT, '.postgres', 'server.log');
const PORT = 5433;

const BIN_DIR = path.join(
  ROOT, 'node_modules', '@embedded-postgres', 'windows-x64', 'native', 'bin',
);
const PG_CTL = path.join(BIN_DIR, process.platform === 'win32' ? 'pg_ctl.exe' : 'pg_ctl');

function fail(message) {
  console.error(`\n  ${message}\n`);
  process.exit(1);
}

if (!existsSync(PG_CTL)) {
  fail(
    'PostgreSQL-Binaries fehlen. Fuehre zuerst "npm install" aus.\n' +
      `  Erwartet unter: ${PG_CTL}`,
  );
}

if (!existsSync(DATA_DIR)) {
  fail('Datenverzeichnis fehlt. Einmalig einrichten mit:\n  npm run db:init');
}

/** Nimmt der Server auf dem Port bereits Verbindungen an? */
function isListening(timeoutMs = 700) {
  return new Promise((resolve) => {
    const socket = net.connect(PORT, '127.0.0.1');
    const done = (value) => {
      socket.destroy();
      resolve(value);
    };
    socket.once('connect', () => done(true));
    socket.once('error', () => done(false));
    socket.setTimeout(timeoutMs, () => done(false));
  });
}

async function waitUntil(expected, attempts = 40) {
  for (let i = 0; i < attempts; i += 1) {
    if ((await isListening()) === expected) return true;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
}

const command = process.argv[2] ?? 'status';

switch (command) {
  case 'start': {
    if (await isListening()) {
      console.log(`  PostgreSQL laeuft bereits auf Port ${PORT}.`);
      break;
    }

    // pg_ctl kehrt unter Windows nicht zuverlaessig zurueck, darum abgekoppelt
    // starten und stattdessen auf den Port warten.
    const child = spawn(
      PG_CTL,
      ['-D', DATA_DIR, '-o', `-p ${PORT}`, '-l', LOG_FILE, 'start'],
      { detached: true, stdio: 'ignore' },
    );
    child.unref();

    if (await waitUntil(true)) {
      console.log(`  PostgreSQL gestartet auf Port ${PORT}. Protokoll: ${LOG_FILE}`);
    } else {
      fail(`Der Server ist nicht hochgekommen. Siehe ${LOG_FILE}`);
    }
    break;
  }

  case 'stop': {
    if (!(await isListening())) {
      console.log('  PostgreSQL laeuft nicht.');
      break;
    }

    spawnSync(PG_CTL, ['-D', DATA_DIR, '-m', 'fast', 'stop'], { stdio: 'ignore' });

    console.log(
      (await waitUntil(false))
        ? '  PostgreSQL gestoppt.'
        : '  PostgreSQL reagiert noch. Bitte kurz warten.',
    );
    break;
  }

  case 'status': {
    console.log(
      (await isListening())
        ? `  PostgreSQL laeuft auf Port ${PORT}.`
        : '  PostgreSQL laeuft nicht. Starten mit: npm run db:start',
    );
    break;
  }

  default:
    fail(`Unbekannter Befehl "${command}". Erlaubt: start | stop | status`);
}
