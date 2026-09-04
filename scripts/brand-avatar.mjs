/**
 * Erzeugt die quadratischen Markenbilder fuer soziale Netzwerke.
 *
 * Die Zeichenwege stammen unveraendert aus `public/brand/leviz-wordmark.svg`,
 * damit Profilbild und Wortmarke nicht auseinanderlaufen. Aufruf:
 *
 *   npm run brand:avatar
 *
 * Ergebnis: je Fassung eine SVG- und eine PNG-Datei in `public/brand/`.
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const OUT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'brand');

/** Instagram zeigt Profilbilder rund; 1080 ist die groesste sinnvolle Kante. */
const SIZE = 1080;

const INK = '#0A0F1C';
const COBALT = '#2F5BFF';
const WHITE = '#FFFFFF';

/** Der V-Chevron der Wortmarke. */
const V = 'M0 0 H16 L28 46 L40 0 H56 L34 72 H22 Z';

/** Die uebrigen Buchstaben, mit ihrer Position im 270er Raster der Wortmarke. */
const LETTERS = [
  { d: 'M0 0 H14 V58 H52 V72 H0 Z', x: 0 },
  { d: 'M0 0 H50 V14 H14 V29 H44 V43 H14 V58 H50 V72 H0 Z', x: 64 },
  { d: 'M0 0 H14 V72 H0 Z', x: 194 },
  { d: 'M0 0 H50 V14 L21 58 H50 V72 H0 V58 L29 14 H0 Z', x: 220 },
];

/**
 * Setzt den Chevron mittig auf die Flaeche.
 *
 * Bewusst ohne den versetzten Zweit-Chevron des Favicons: was auf 48 Pixeln
 * als Andeutung von Bewegung durchgeht, liest sich auf 1080 Pixeln als
 * Druckfehler.
 *
 * @param {number} height Hoehe des Zeichens in Bildpunkten.
 * @param {string} color Fuellfarbe.
 * @param {number} shiftY Verschiebung nach unten; negativ hebt an.
 */
function chevron(height, color, shiftY = 0) {
  const scale = height / 72;
  const width = 56 * scale;

  return `<path d="${V}" fill="${color}" transform="translate(${
    (SIZE - width) / 2
  } ${(SIZE - height) / 2 + shiftY}) scale(${scale})"/>`;
}

/**
 * Setzt den Schriftzug LEVIZ mittig auf die angegebene Hoehe.
 *
 * @param {number} width Breite des Schriftzugs in Bildpunkten.
 * @param {number} y Obere Kante.
 */
function wordmark(width, y, letterColor, vColor) {
  const scale = width / 270;
  const letters = LETTERS.map((letter) => `<path d="${letter.d}" transform="translate(${letter.x} 0)"/>`).join('');

  return `<g transform="translate(${(SIZE - width) / 2} ${y}) scale(${scale})">
      <g fill="${letterColor}">${letters}</g>
      <path d="${V}" transform="translate(126 0)" fill="${vColor}"/>
    </g>`;
}

const VARIANTS = {
  // Deckt sich mit dem App-Symbol. Erste Wahl fuers Profilbild: auch als
  // 32 Pixel grosser Kreis in der Zeitleiste noch eindeutig.
  'leviz-avatar-cobalt': `<rect width="${SIZE}" height="${SIZE}" fill="${COBALT}"/>${chevron(520, WHITE)}`,

  // Dunkle Fassung, falls das Blau neben anderen Marken untergeht.
  'leviz-avatar-ink': `<rect width="${SIZE}" height="${SIZE}" fill="${INK}"/>${chevron(520, COBALT)}`,

  // Zeichen mit Schriftzug. Auf der Profilseite lesbar, im Feed nicht mehr —
  // taugt daher eher als Beitragsbild als fuers Profilbild selbst.
  'leviz-avatar-lockup': `<rect width="${SIZE}" height="${SIZE}" fill="${INK}"/>${chevron(
    360,
    WHITE,
    -120,
  )}${wordmark(420, 700, WHITE, COBALT)}`,
};

for (const [name, body] of Object.entries(VARIANTS)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" role="img" aria-label="LEVIZ">${body}</svg>`;

  writeFileSync(path.join(OUT_DIR, `${name}.svg`), `${svg}\n`);
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(path.join(OUT_DIR, `${name}.png`));

  console.log(`  ${name}  ${SIZE}×${SIZE}`);
}
