/**
 * Erzeugt die Symbole der App aus der Wortmarke -- dieselben Zeichenwege
 * wie `public/brand/leviz-wordmark.svg` und `scripts/brand-avatar.mjs`.
 *
 *   node scripts/app-icons.mjs
 *
 * Ergebnis in `mobile/assets/images/`:
 *   icon.png                    1024x1024, iOS und Vorgabe: V auf Tinte
 *   android-icon-foreground.png 1024x1024, transparent, V in der sicheren Zone
 *   android-icon-background.png 1024x1024, Tinte
 *   android-icon-monochrome.png 1024x1024, weisses V, transparent (Android 13+)
 *   splash-icon.png             512x512, weisses V, transparent
 *   favicon.png                 64x64, V auf Tinte
 *
 * Kein Farbverlauf, kein Schatten: ein Symbol muss auf 29 Pixeln im
 * Einstellungsmenue genauso lesbar sein wie auf 1024 im Store.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'mobile', 'assets', 'images');
mkdirSync(OUT, { recursive: true });

const INK = '#0A0F1C';
const WHITE = '#FFFFFF';

/** Der V-Chevron der Wortmarke, 56 breit, 72 hoch. */
const V = 'M0 0 H16 L28 46 L40 0 H56 L34 72 H22 Z';

/**
 * Das V mittig auf eine quadratische Flaeche.
 *
 * `anteil` ist die Hoehe des V im Verhaeltnis zur Kante. Fuer das
 * Android-Vordergrundbild bleibt es in der sicheren Zone (die aeusseren
 * 18 % je Seite werden je nach Form der Maske abgeschnitten).
 */
function svg(size, { background, fill, anteil }) {
  const hoehe = size * anteil;
  const scale = hoehe / 72;
  const breite = 56 * scale;
  const x = (size - breite) / 2;
  const y = (size - hoehe) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${background ? `<rect width="${size}" height="${size}" fill="${background}"/>` : ''}
  <path d="${V}" fill="${fill}" transform="translate(${x} ${y}) scale(${scale})"/>
</svg>`;
}

const DATEIEN = [
  ['icon.png', 1024, { background: INK, fill: WHITE, anteil: 0.5 }],
  ['android-icon-foreground.png', 1024, { background: null, fill: WHITE, anteil: 0.36 }],
  ['android-icon-background.png', 1024, { background: INK, fill: INK, anteil: 0 }],
  ['android-icon-monochrome.png', 1024, { background: null, fill: WHITE, anteil: 0.36 }],
  ['splash-icon.png', 512, { background: null, fill: WHITE, anteil: 0.8 }],
  ['favicon.png', 64, { background: INK, fill: WHITE, anteil: 0.6 }],
];

for (const [name, size, form] of DATEIEN) {
  const png = await sharp(Buffer.from(svg(size, form))).png().toBuffer();
  writeFileSync(path.join(OUT, name), png);
  console.log(`  ${name.padEnd(30)} ${size}x${size}`);
}

/** Zum Nachsehen im Browser: alle Symbole nebeneinander. */
const schau = await sharp({ create: { width: 1024 * 3 + 64 * 2, height: 1024, channels: 4, background: '#F7F8FA' } })
  .composite([
    { input: path.join(OUT, 'icon.png'), left: 0, top: 0 },
    { input: await sharp(Buffer.from(svg(1024, { background: '#2F5BFF', fill: WHITE, anteil: 0.36 }))).png().toBuffer(), left: 1024 + 64, top: 0 },
    { input: path.join(OUT, 'android-icon-foreground.png'), left: 1024 + 64, top: 0 },
    { input: await sharp(Buffer.from(svg(1024, { background: INK, fill: INK, anteil: 0 }))).png().toBuffer(), left: 2 * (1024 + 64), top: 0 },
    { input: path.join(OUT, 'splash-icon.png'), left: 2 * (1024 + 64) + 256, top: 256 },
  ])
  .png()
  .toBuffer();
writeFileSync(path.join(OUT, '..', 'icons-preview.png'), schau);
console.log('  Vorschau: mobile/assets/icons-preview.png');
