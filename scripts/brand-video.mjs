/**
 * Baut das Werbevideo aus den Aufnahmen in `public/brand/shots/`.
 *
 * Ablauf: je Szene ein langsamer Schwenk über die Aufnahme, darüber eine
 * Textebene, dazwischen weiche Übergänge. Zwanzig Sekunden, 1080×1920,
 * hochkant für Instagram Reels und TikTok.
 *
 * Voraussetzung: `node scripts/capture-shots.mjs` und ffmpeg im Pfad.
 * Aufruf: npm run brand:video
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = path.join(ROOT, 'public', 'brand', 'shots');
const WORK = path.join(ROOT, '.video-work');
const OUT = path.join(ROOT, 'public', 'brand', 'leviz-reel.mp4');

const W = 1080;
const H = 1920;
const FPS = 30;

const INK = '#0A0F1C';
const COBALT = '#2F5BFF';
const WHITE = '#FFFFFF';
const FONT = "'Segoe UI', 'Inter', Arial, sans-serif";

const V = 'M0 0 H16 L28 46 L40 0 H56 L34 72 H22 Z';

const LETTERS = [
  { d: 'M0 0 H14 V58 H52 V72 H0 Z', x: 0 },
  { d: 'M0 0 H50 V14 H14 V29 H44 V43 H14 V58 H50 V72 H0 Z', x: 64 },
  { d: 'M0 0 H14 V72 H0 Z', x: 194 },
  { d: 'M0 0 H50 V14 L21 58 H50 V72 H0 V58 L29 14 H0 Z', x: 220 },
];

/**
 * Die Szenen. `shot` verweist auf eine Aufnahme, `pan` gibt an, wie weit
 * innerhalb der Aufnahme nach unten gefahren wird (0 bis 1).
 */
const SCENES = [
  { shot: null, seconds: 3.0, title: ['LEVIZ'], sub: 'Tregu online i veturave' },
  {
    shot: '01-home.png', seconds: 3.6, pan: 0.55,
    title: ['Gjej veturën', 'tënde të radhës'],
    sub: 'Mbi 240 shpallje nga i gjithë rajoni',
  },
  {
    shot: '02-search.png', seconds: 3.6, pan: 0.6,
    title: ['Filtro saktë'],
    sub: 'Çmimi, viti, kilometrat, karburanti, qyteti',
  },
  {
    shot: '03-vehicle.png', seconds: 3.6, pan: 0.5,
    title: ['I doganuar?', 'Targat?'],
    sub: 'E sheh para se ta marrësh telefonin',
  },
  {
    shot: '04-compare.png', seconds: 3.3, pan: 0.45,
    title: ['Krahaso 4 vetura'],
    sub: 'Vetëm dallimet, njëra pranë tjetrës',
  },
  {
    shot: '06-pricing.png', seconds: 3.1, pan: 0.35,
    title: ['Shpallja e parë', 'është falas'],
    sub: 'Pa komision, pa kufizime',
  },
  // Keine erfundene Adresse: die Domain steht erst fest, wenn sie registriert ist.
  { shot: null, seconds: 2.2, title: ['Gjej. Krahaso. Lëviz.'], sub: 'Së shpejti' },
];

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

const escapeXml = (value) =>
  value.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);

/**
 * Textebene einer Szene.
 *
 * Der Text sitzt unten in einem dunklen Verlauf. Oben bleibt die Aufnahme
 * frei — dort steht die Kopfzeile der Seite mit der Wortmarke.
 */
function overlay(scene) {
  const lines = scene.title;
  const titleSize = lines.some((l) => l.length > 16) ? 66 : 78;
  const firstY = H - 300 - (lines.length - 1) * (titleSize + 14);

  const body = [
    // Der Verlauf muss zuverlässig decken: darunter liegen Fotos und Tabellen,
    // auf denen weiße Schrift sonst stellenweise verschwindet.
    `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${INK}" stop-opacity="0"/>
        <stop offset="0.3" stop-color="${INK}" stop-opacity="0.85"/>
        <stop offset="0.55" stop-color="${INK}" stop-opacity="0.97"/>
        <stop offset="1" stop-color="${INK}" stop-opacity="1"/>
      </linearGradient></defs>`,
    `<rect x="0" y="${H - 820}" width="${W}" height="820" fill="url(#g)"/>`,
    ...lines.map((line, i) => textLine(line, firstY + i * (titleSize + 14), titleSize, WHITE, 700)),
    `<rect x="${W / 2 - 60}" y="${H - 246}" width="120" height="6" rx="3" fill="${COBALT}"/>`,
    textLine(scene.sub, H - 170, 42, '#C9D2E8', 500),
  ].join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${body}</svg>`;
}

/** Titel- und Schlussbild ohne Aufnahme. */
function card(scene, closing) {
  const body = [
    `<rect width="${W}" height="${H}" fill="${INK}"/>`,
    `<path d="${V}" fill="${COBALT}" opacity="0.07" transform="translate(${(W - 56 * 12.5) / 2} 300) scale(12.5)"/>`,
    closing
      ? [
          wordmark(300, 700),
          textLine(scene.title[0], 1080, 62, COBALT, 700),
          textLine(scene.sub, 1180, 44, '#C9D2E8', 500),
        ].join('')
      : [
          wordmark(420, 820),
          textLine(scene.sub, 1010, 46, '#C9D2E8', 500),
        ].join(''),
  ].join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${body}</svg>`;
}

const ffmpeg = (args) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' });

async function main() {
  mkdirSync(WORK, { recursive: true });

  const parts = [];

  for (const [index, scene] of SCENES.entries()) {
    const clip = path.join(WORK, `scene-${index}.mp4`);

    if (!scene.shot) {
      const png = path.join(WORK, `card-${index}.png`);
      await sharp(Buffer.from(card(scene, index === SCENES.length - 1))).png().toFile(png);

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

      const png = path.join(WORK, `overlay-${index}.png`);
      await sharp(Buffer.from(overlay(scene))).png().toFile(png);

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
    console.log(`  Szene ${index + 1}/${SCENES.length}  ${scene.seconds}s`);
  }

  // Weiche Übergänge zwischen den Teilen.
  const fade = 0.4;
  const inputs = parts.flatMap((part) => ['-i', part]);

  let filter = '';
  let previous = '[0:v]';
  let elapsed = SCENES[0].seconds;

  for (let i = 1; i < parts.length; i += 1) {
    const label = i === parts.length - 1 ? '[v]' : `[x${i}]`;
    filter += `${previous}[${i}:v]xfade=transition=fade:duration=${fade}:offset=${(elapsed - fade).toFixed(2)}${label};`;
    previous = label;
    elapsed += SCENES[i].seconds - fade;
  }

  ffmpeg([
    ...inputs,
    '-filter_complex', filter.replace(/;$/, ''),
    '-map', '[v]',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '20',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
    OUT,
  ]);

  const total = SCENES.reduce((sum, s) => sum + s.seconds, 0) - fade * (SCENES.length - 1);
  console.log(`\n  ${path.relative(ROOT, OUT)}  ${W}×${H}  ${total.toFixed(1)}s`);
}

await main();
