/**
 * Baut die Werbevideos aus den Aufnahmen in `public/brand/shots/`.
 *
 * Zwei Fassungen, beide 1080×1920 und zwanzig Sekunden:
 *
 *   npm run brand:video        Teil 1 — ruhige Vorstellung der Funktionen
 *   npm run brand:video -- 2   Teil 2 — Fragen zuerst, dann die Auflösung
 *
 * Voraussetzung: `npm run brand:shots` und ffmpeg im Pfad.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = path.join(ROOT, 'public', 'brand', 'shots');
const WORK = path.join(ROOT, '.video-work');

const W = 1080;
const H = 1920;
const FPS = 30;

const INK = '#0A0F1C';
const COBALT = '#2F5BFF';
const WHITE = '#FFFFFF';
const MUTED = '#C9D2E8';
const FONT = "'Segoe UI', 'Inter', Arial, sans-serif";

const V = 'M0 0 H16 L28 46 L40 0 H56 L34 72 H22 Z';

const LETTERS = [
  { d: 'M0 0 H14 V58 H52 V72 H0 Z', x: 0 },
  { d: 'M0 0 H50 V14 H14 V29 H44 V43 H14 V58 H50 V72 H0 Z', x: 64 },
  { d: 'M0 0 H14 V72 H0 Z', x: 194 },
  { d: 'M0 0 H50 V14 L21 58 H50 V72 H0 V58 L29 14 H0 Z', x: 220 },
];

// ---------------------------------------------------------------------------
// Bildfolgen
// ---------------------------------------------------------------------------

/**
 * Teil 1: ruhig. Eine Funktion je Szene, langsamer Schwenk, weiche Übergänge.
 */
const PART_ONE = [
  { kind: 'card', seconds: 3.0, title: ['LEVIZ'], sub: 'Tregu online i veturave' },
  {
    kind: 'feature', shot: '01-home.png', seconds: 3.6, pan: 0.55,
    title: ['Gjej veturën', 'tënde të radhës'],
    sub: 'Mbi 240 shpallje nga i gjithë rajoni',
  },
  {
    kind: 'feature', shot: '02-search.png', seconds: 3.6, pan: 0.6,
    title: ['Filtro saktë'],
    sub: 'Çmimi, viti, kilometrat, karburanti, qyteti',
  },
  {
    kind: 'feature', shot: '03-vehicle.png', seconds: 3.6, pan: 0.5,
    title: ['I doganuar?', 'Targat?'],
    sub: 'E sheh para se ta marrësh telefonin',
  },
  {
    kind: 'feature', shot: '04-compare.png', seconds: 3.3, pan: 0.45,
    title: ['Krahaso 4 vetura'],
    sub: 'Vetëm dallimet, njëra pranë tjetrës',
  },
  {
    kind: 'feature', shot: '06-pricing.png', seconds: 3.1, pan: 0.35,
    title: ['Shpallja e parë', 'është falas'],
    sub: 'Pa komision, pa kufizime',
  },
  // Keine erfundene Adresse: die Domain steht erst fest, wenn sie registriert ist.
  { kind: 'card', seconds: 2.2, closing: true, title: ['Gjej. Krahaso. Lëviz.'], sub: 'Së shpejti' },
];

/**
 * Teil 2: mit Spannung. Erst drei Fragen, die jeder beim Autokauf kennt, hart
 * geschnitten und mit abgedunkeltem Hintergrund. Dann der Umschlag auf die
 * Marke, danach die Antworten in schnellerer Folge.
 */
const PART_TWO = [
  { kind: 'card', seconds: 2.3, fade: 0.25, title: ['Para se ta blesh…'], sub: 'tri pyetje' },

  {
    kind: 'question', shot: '03-vehicle.png', seconds: 1.85, pan: 0.2, fade: 0.1,
    title: ['A është', 'e doganuar?'],
  },
  {
    kind: 'question', shot: '02-search.png', seconds: 1.85, pan: 0.3, fade: 0.1,
    title: ['Sa është', 'çmimi i drejtë?'],
  },
  {
    kind: 'question', shot: '05-dealers.png', seconds: 1.85, pan: 0.25, fade: 0.1,
    title: ['Kujt', 't’i besosh?'],
  },

  // Der Umschlag: langsamer Übergang, damit der Bruch spürbar wird.
  { kind: 'card', seconds: 2.5, fade: 0.6, title: ['Tani i sheh.'], sub: 'Të gjitha, në një vend' },

  {
    kind: 'feature', shot: '03-vehicle.png', seconds: 3.05, pan: 0.51, fade: 0.25,
    title: ['I doganuar.', 'Targa RKS.'],
    sub: 'Shkruar në shpallje, jo në telefon',
  },
  {
    kind: 'feature', shot: '07-estimate.png', seconds: 3.05, pan: 0.78, fade: 0.25,
    title: ['Çmimi i krahasuar'],
    sub: 'Nga shpalljet aktive, jo nga hamendja',
  },
  {
    kind: 'feature', shot: '05-dealers.png', seconds: 2.75, pan: 0.85, fade: 0.25,
    title: ['Autosallone të', 'verifikuara'],
    sub: 'Me vlerësime nga blerësit',
  },

  { kind: 'card', seconds: 2.75, closing: true, title: ['Gjej. Krahaso. Lëviz.'], sub: 'Së shpejti' },
];

const STORYBOARDS = { 1: PART_ONE, 2: PART_TWO };

// ---------------------------------------------------------------------------
// Zeichnen
// ---------------------------------------------------------------------------

const escapeXml = (value) =>
  value.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);

/** Wortmarke als SVG-Fragment, mittig auf der angegebenen Höhe. */
function wordmark(width, y) {
  const scale = width / 270;
  const letters = LETTERS.map((l) => `<path d="${l.d}" transform="translate(${l.x} 0)"/>`).join('');

  return `<g transform="translate(${(W - width) / 2} ${y}) scale(${scale})">
      <g fill="${WHITE}">${letters}</g>
      <path d="${V}" transform="translate(126 0)" fill="${COBALT}"/>
    </g>`;
}

function textLine(text, y, size, color, weight) {
  return `<text x="${W / 2}" y="${y}" text-anchor="middle" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${color}">${escapeXml(text)}</text>`;
}

const svg = (body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${body}</svg>`;

/**
 * Textebene einer Funktionsszene.
 *
 * Der Verlauf muss zuverlässig decken: darunter liegen Fotos und Tabellen, auf
 * denen weiße Schrift sonst stellenweise verschwindet.
 */
function featureOverlay(scene) {
  const lines = scene.title;
  const titleSize = lines.some((l) => l.length > 16) ? 66 : 78;
  const firstY = H - 300 - (lines.length - 1) * (titleSize + 14);

  return svg(
    [
      `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${INK}" stop-opacity="0"/>
        <stop offset="0.3" stop-color="${INK}" stop-opacity="0.85"/>
        <stop offset="0.55" stop-color="${INK}" stop-opacity="0.97"/>
        <stop offset="1" stop-color="${INK}" stop-opacity="1"/>
      </linearGradient></defs>`,
      `<rect x="0" y="${H - 820}" width="${W}" height="820" fill="url(#g)"/>`,
      ...lines.map((line, i) => textLine(line, firstY + i * (titleSize + 14), titleSize, WHITE, 700)),
      `<rect x="${W / 2 - 60}" y="${H - 246}" width="120" height="6" rx="3" fill="${COBALT}"/>`,
      textLine(scene.sub, H - 170, 42, MUTED, 500),
    ].join(''),
  );
}

/**
 * Textebene einer Frageszene.
 *
 * Der Hintergrund wird fast vollständig abgedunkelt und die Frage steht groß
 * in der Mitte. Man ahnt die Seite dahinter, liest aber nur die Frage — das
 * hält die drei schnellen Schnitte lesbar.
 */
function questionOverlay(scene) {
  const size = 96;
  const firstY = H / 2 - ((scene.title.length - 1) * (size + 18)) / 2 + size / 3;

  return svg(
    [
      `<rect width="${W}" height="${H}" fill="${INK}" opacity="0.86"/>`,
      ...scene.title.map((line, i) =>
        textLine(line, firstY + i * (size + 18), size, WHITE, 700),
      ),
      `<rect x="${W / 2 - 40}" y="${firstY + scene.title.length * (size + 18) - 20}" width="80" height="6" rx="3" fill="${COBALT}"/>`,
    ].join(''),
  );
}

/** Titel- und Schlussbild ohne Aufnahme. */
function card(scene) {
  return svg(
    [
      `<rect width="${W}" height="${H}" fill="${INK}"/>`,
      `<path d="${V}" fill="${COBALT}" opacity="0.07" transform="translate(${(W - 56 * 12.5) / 2} 300) scale(12.5)"/>`,
      scene.closing
        ? [
            wordmark(300, 700),
            textLine(scene.title[0], 1080, 62, COBALT, 700),
            textLine(scene.sub, 1180, 44, MUTED, 500),
          ].join('')
        : [
            wordmark(420, 820),
            textLine(scene.sub, 1010, 46, MUTED, 500),
          ].join(''),
    ].join(''),
  );
}

// ---------------------------------------------------------------------------
// Schneiden
// ---------------------------------------------------------------------------

const ffmpeg = (args) =>
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' });

async function main() {
  const part = Number(process.argv[2] ?? 1);
  const scenes = STORYBOARDS[part];
  if (!scenes) throw new Error(`Unbekannter Teil: ${part}. Erlaubt sind 1 und 2.`);

  const out = path.join(ROOT, 'public', 'brand', part === 1 ? 'leviz-reel.mp4' : `leviz-reel-${part}.mp4`);

  mkdirSync(WORK, { recursive: true });
  const parts = [];

  for (const [index, scene] of scenes.entries()) {
    const clip = path.join(WORK, `p${part}-scene-${index}.mp4`);

    if (scene.kind === 'card') {
      const png = path.join(WORK, `p${part}-card-${index}.png`);
      await sharp(Buffer.from(card(scene))).png().toFile(png);

      ffmpeg([
        '-loop', '1', '-i', png,
        '-t', String(scene.seconds), '-r', String(FPS),
        '-vf', `scale=${W}:${H},format=yuv420p`,
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '18',
        clip,
      ]);
    } else {
      const source = path.join(SHOTS, scene.shot);
      if (!existsSync(source)) throw new Error(`Aufnahme fehlt: ${scene.shot}`);

      const { height } = await sharp(source).metadata();
      // Der Schwenk bleibt innerhalb der Aufnahme; ohne Spielraum steht er still.
      const travel = Math.max(0, Math.round((height - H) * scene.pan));

      const png = path.join(WORK, `p${part}-overlay-${index}.png`);
      const overlay = scene.kind === 'question' ? questionOverlay(scene) : featureOverlay(scene);
      await sharp(Buffer.from(overlay)).png().toFile(png);

      ffmpeg([
        '-loop', '1', '-i', source,
        '-loop', '1', '-i', png,
        '-t', String(scene.seconds), '-r', String(FPS),
        '-filter_complex',
        `[0:v]crop=${W}:${H}:0:'min(${travel},${travel}*t/${scene.seconds})',` +
          `scale=${W}:${H}[bg];[bg][1:v]overlay=0:0,format=yuv420p[v]`,
        '-map', '[v]',
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '18',
        clip,
      ]);
    }

    parts.push(clip);
    console.log(`  Szene ${index + 1}/${scenes.length}  ${scene.seconds}s  ${scene.kind}`);
  }

  // Übergänge. Die Länge steht je Szene: ein kurzer Wert wirkt wie ein
  // harter Schnitt, ein langer als Umschlag.
  const inputs = parts.flatMap((p) => ['-i', p]);

  let filter = '';
  let previous = '[0:v]';
  let elapsed = scenes[0].seconds;
  let total = scenes[0].seconds;

  for (let i = 1; i < parts.length; i += 1) {
    const fade = scenes[i].fade ?? 0.4;
    const label = i === parts.length - 1 ? '[v]' : `[x${i}]`;

    filter += `${previous}[${i}:v]xfade=transition=fade:duration=${fade}:offset=${(elapsed - fade).toFixed(2)}${label};`;
    previous = label;
    elapsed += scenes[i].seconds - fade;
    total += scenes[i].seconds - fade;
  }

  ffmpeg([
    ...inputs,
    '-filter_complex', filter.replace(/;$/, ''),
    '-map', '[v]',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '20',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
    out,
  ]);

  console.log(`\n  ${path.relative(ROOT, out)}  ${W}×${H}  ${total.toFixed(1)}s`);
}

await main();
