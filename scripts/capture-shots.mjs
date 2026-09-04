/**
 * Nimmt die Seiten in Telefonformat auf — Grundlage fuer das Werbevideo.
 *
 * Chrome wird ueber das DevTools-Protokoll gesteuert statt ueber
 * `--screenshot`: nur so laesst sich echte Telefon-Emulation erzwingen. Mit
 * dem einfachen Schalter legt der Browser die Seite breiter aus als das
 * Fenster, und der Inhalt wird rechts abgeschnitten.
 *
 * Aufruf:  node scripts/capture-shots.mjs [Basisadresse]
 * Ergebnis: PNG-Dateien in public/brand/shots/
 */
import 'dotenv/config';

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'public', 'brand', 'shots');

const BASE = process.argv[2] ?? 'http://localhost:3000';
const PORT = 9333;

/** Telefonmaße: iPhone-typische 390×844 Punkte bei knapp dreifacher Dichte. */
const DEVICE = { width: 390, height: 844, scale: 2.7692 };

/**
 * Was aufgenommen wird. `height` in CSS-Punkten, damit lange Seiten passen.
 *
 * `url: null` steht für das automatisch gewählte Inserat. Bei `estimate` wird
 * zusätzlich weit genug gescrollt, dass die Preiseinschätzung im Bild ist —
 * sie steht auf dem Telefon unter der Verkäuferbox.
 */
const SCENES = [
  { name: '01-home', url: '/', height: 1300 },
  { name: '02-search', url: '/kerko', height: 1500 },
  { name: '03-vehicle', url: null, height: 1600 },
  { name: '04-compare', url: '/krahaso', height: 1100 },
  { name: '05-dealers', url: '/shitesit', height: 1300 },
  { name: '06-pricing', url: '/cmimet', height: 1500 },
  { name: '07-estimate', url: null, height: 1400, scrollToText: 'Vlerësim i çmimit' },
];

const CHROME_PATHS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
];

function findChrome() {
  const found = CHROME_PATHS.find((candidate) => existsSync(candidate));
  if (!found) throw new Error('Chrome nicht gefunden.');
  return found;
}

/** Wartet, bis der Debug-Anschluss antwortet. */
async function waitForDebugger(timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (response.ok) return;
    } catch {
      // Noch nicht bereit.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error('Chrome hat den Debug-Anschluss nicht geoeffnet.');
}

/** Duenne Hülle um eine CDP-Verbindung. */
function connect(url) {
  const socket = new WebSocket(url);
  const pending = new Map();
  const listeners = new Map();
  let nextId = 1;

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);

    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);

      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);

      return;
    }

    if (message.method && listeners.has(message.method)) {
      for (const handler of listeners.get(message.method)) handler(message.params);
    }
  });

  const ready = new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });

  return {
    ready,
    send(method, params = {}) {
      const id = nextId++;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
    once(method) {
      return new Promise((resolve) => {
        const handler = (params) => {
          listeners.get(method).delete(handler);
          resolve(params);
        };
        if (!listeners.has(method)) listeners.set(method, new Set());
        listeners.get(method).add(handler);
      });
    },
    close: () => socket.close(),
  };
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const chrome = spawn(
    findChrome(),
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--no-first-run',
      '--no-default-browser-check',
      // Albanisch ist die Sprache des Zielmarkts und ohne Praefix erreichbar.
      '--accept-lang=sq-AL,sq',
      `--remote-debugging-port=${PORT}`,
      // Das Profil liegt bewusst ausserhalb des Projekts: Chrome legt dort
      // mitgelieferte Erweiterungen ab, die sonst mitgeprueft und mitversioniert
      // wuerden.
      `--user-data-dir=${path.join(tmpdir(), 'leviz-capture-profile')}`,
      'about:blank',
    ],
    { stdio: 'ignore', detached: false },
  );

  try {
    await waitForDebugger();

    const { listingPath, compareIds } = await pickVehicles();

    const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
    const page = targets.find((target) => target.type === 'page');
    const client = connect(page.webSocketDebuggerUrl);
    await client.ready;

    await client.send('Page.enable');
    await client.send('Network.enable');

    // Die Vergleichsseite liest ihre Auswahl aus einem Cookie. Ohne ihn zeigt
    // sie den leeren Zustand — für eine Vorstellung des Portals wertlos.
    if (compareIds.length > 0) {
      await client.send('Network.setCookie', {
        name: 'leviz.compare',
        value: compareIds.join(','),
        url: BASE,
        path: '/',
      });
    }

    for (const scene of SCENES) {
      const url = scene.url ?? listingPath;
      if (!url) {
        console.log(`  ${scene.name.padEnd(12)} uebersprungen (kein Inserat gefunden)`);
        continue;
      }

      await client.send('Emulation.setDeviceMetricsOverride', {
        width: DEVICE.width,
        height: scene.height,
        deviceScaleFactor: DEVICE.scale,
        mobile: true,
      });

      const loaded = client.once('Page.loadEventFired');
      await client.send('Page.navigate', { url: `${BASE}${url}` });
      await loaded;

      // Bilder und Schriften brauchen nach dem Ladeereignis noch einen Moment.
      await wait(2500);

      if (scene.scrollToText) {
        // Gezielt zum Abschnitt statt zu einer geratenen Pixelhoehe: die
        // Seitenlaenge haengt an der Zahl der Fotos und Ausstattungszeilen.
        await client.send('Runtime.evaluate', {
          // Gesucht wird die Ueberschrift selbst, nicht ein Abschnitt, der den
          // Text enthaelt: sonst trifft der umschliessende Bereich zuerst und
          // in dessen Mitte liegt die Karte nicht.
          expression: `
            (() => {
              const needle = ${JSON.stringify(scene.scrollToText)};
              const heading = [...document.querySelectorAll('h1, h2, h3')]
                .find((el) => el.textContent.trim() === needle);
              if (heading) heading.scrollIntoView({ block: 'center' });
              return Boolean(heading);
            })()
          `,
          returnByValue: true,
        });
        // Nach dem Springen laden die Bilder darunter erst nach.
        await wait(1800);
      }

      // Bewusst nur der eingestellte Ausschnitt: die ganze Seite waere bis zu
      // 33.000 Pixel hoch und fuer das Video unbrauchbar. Die Hoehe je Szene
      // ist so gewaehlt, dass beim Schwenk Spielraum bleibt.
      const shot = await client.send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: false,
      });

      const file = path.join(OUT_DIR, `${scene.name}.png`);
      writeFileSync(file, Buffer.from(shot.data, 'base64'));
      console.log(`  ${scene.name.padEnd(12)} ${url}`);
    }

    client.close();
  } finally {
    chrome.kill();
  }
}

/**
 * Ein gut bebildertes Inserat für die Detailseite und drei weitere für den
 * Vergleich.
 *
 * Direkt über `pg` statt über Prisma: das Skript läuft mit blankem Node und
 * soll keine TypeScript-Kette brauchen.
 */
async function pickVehicles() {
  const { default: pg } = await import('pg');
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    // Nur Inserate, deren Modell genug aktive Vergleichsangebote hat: sonst
    // verweigert die Preiseinschätzung zu Recht die Auskunft und fehlt im Bild.
    const { rows } = await client.query(
      `SELECT v.id, v.slug
         FROM "Vehicle" v
         JOIN "VehicleImage" i ON i."vehicleId" = v.id AND i.position = 0
        WHERE v.status = 'ACTIVE'
          AND (
            SELECT count(*) FROM "Vehicle" o
             WHERE o."modelId" = v."modelId"
               AND o.status = 'ACTIVE'
               AND o.fuel = v.fuel
          ) >= 5
        ORDER BY v."qualityScore" DESC, v."rankScore" DESC
        LIMIT 3`,
    );

    return {
      listingPath: rows[0] ? `/vetura/${rows[0].slug}` : null,
      compareIds: rows.map((row) => row.id),
    };
  } finally {
    await client.end();
  }
}

await main();
process.exit(0);
