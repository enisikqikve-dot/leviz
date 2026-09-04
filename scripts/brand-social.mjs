/**
 * Erzeugt die Beitrags- und Story-Bilder fuer soziale Netzwerke.
 *
 * Der Schriftzug kommt als Zeichenweg aus `public/brand/leviz-wordmark.svg`
 * und ist damit unabhaengig von installierten Schriften. Der uebrige Text
 * nutzt eine Systemschrift; die albanischen Zeichen ë und ç sind dort
 * enthalten. Zeilenumbrueche stehen fest im Text, weil SVG keinen Umbruch
 * kennt. Aufruf:
 *
 *   npm run brand:social
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const OUT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'brand');

/** Instagram: quadratischer Beitrag 1080×1080, Story 1080×1920. */
const POST = { w: 1080, h: 1080 };
const STORY = { w: 1080, h: 1920 };

const INK = '#0A0F1C';
const COBALT = '#2F5BFF';
const WHITE = '#FFFFFF';
const MUTED = '#9AA6C0';
const MUTED_LIGHT = '#5B6478';
const PAPER = '#F7F8FA';

const FONT = "'Segoe UI', 'Inter', Arial, sans-serif";

const V = 'M0 0 H16 L28 46 L40 0 H56 L34 72 H22 Z';

const LETTERS = [
  { d: 'M0 0 H14 V58 H52 V72 H0 Z', x: 0 },
  { d: 'M0 0 H50 V14 H14 V29 H44 V43 H14 V58 H50 V72 H0 Z', x: 64 },
  { d: 'M0 0 H14 V72 H0 Z', x: 194 },
  { d: 'M0 0 H50 V14 L21 58 H50 V72 H0 V58 L29 14 H0 Z', x: 220 },
];

/** Setzt den Schriftzug LEVIZ mittig auf die angegebene Hoehe. */
function wordmark(canvas, width, y, letterColor) {
  const scale = width / 270;
  const letters = LETTERS.map((letter) => `<path d="${letter.d}" transform="translate(${letter.x} 0)"/>`).join('');

  return `<g transform="translate(${(canvas.w - width) / 2} ${y}) scale(${scale})">
      <g fill="${letterColor}">${letters}</g>
      <path d="${V}" transform="translate(126 0)" fill="${COBALT}"/>
    </g>`;
}

/** Eine mittig gesetzte Textzeile. */
function line(canvas, text, y, { size, color = WHITE, weight = 400, spacing = 0 } = {}) {
  return `<text x="${canvas.w / 2}" y="${y}" text-anchor="middle" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${color}" letter-spacing="${spacing}">${text}</text>`;
}

/** Mehrere Zeilen untereinander, mittig. */
function block(canvas, texts, startY, gap, options) {
  return texts.map((text, index) => line(canvas, text, startY + index * gap, options)).join('');
}

/**
 * Der Chevron als grosses, sehr blasses Hintergrundzeichen. Mittig gesetzt und
 * unten aus dem Bild laufend: angeschnitten an nur einer Kante wirkt der
 * Anschnitt gewollt, seitlich versetzt sah er wie ein zufaelliger Keil aus.
 */
function watermark(canvas, height, top, color, opacity) {
  const scale = height / 72;

  return `<path d="${V}" fill="${color}" opacity="${opacity}" transform="translate(${
    (canvas.w - 56 * scale) / 2
  } ${top}) scale(${scale})"/>`;
}

/** Ein Merkmal in einer Zeile, mit vorangestelltem Punkt. */
function bullets(canvas, items, startY, gap, color) {
  return items
    .map((text, index) => line(canvas, `·  ${text}`, startY + index * gap, { size: 38, color }))
    .join('');
}

/** Die Merkmale, die LEVIZ von westeuropaeischen Portalen unterscheiden. */
const FEATURES = [
  'Blej dhe shit pa pagesë',
  'I doganuar ose i padoganuar',
  'Targa RKS, AL, MK dhe të huaja',
];

/**
 * Die Karten der Merkmalsreihe. Als Karussell veroeffentlichbar; der Zaehler
 * oben rechts macht die Reihenfolge auch einzeln erkennbar.
 */
const SERIES = [
  {
    name: 'leviz-instagram-01-dogana',
    headline: ['I doganuar apo', 'i padoganuar?'],
    body: ['Filtro sipas statusit doganor dhe shiko', 'vetëm veturat që të interesojnë.'],
  },
  {
    name: 'leviz-instagram-02-targa',
    headline: ['Targa RKS, AL,', 'MK dhe të huaja'],
    body: ['Sheh prej nga vjen vetura ende pa e', 'kontaktuar shitësin.'],
  },
  {
    name: 'leviz-instagram-03-falas',
    headline: ['Shpallje falas'],
    body: ['Publiko veturën tënde pa pagesë.', 'Pa komision dhe pa kufi shpalljesh.'],
  },
];

/** Eine Karte der Merkmalsreihe. */
function seriesCard(card, index) {
  const c = POST;

  return `
    <rect width="${c.w}" height="${c.h}" fill="${INK}"/>
    ${watermark(c, 900, 250, COBALT, 0.07)}
    ${wordmark(c, 230, 96, WHITE)}
    ${line(c, `${index + 1} / ${SERIES.length}`, 215, { size: 30, color: MUTED, weight: 600, spacing: 2 })}
    ${block(c, card.headline, card.headline.length > 1 ? 440 : 490, 96, {
      size: 82,
      weight: 700,
    })}
    <rect x="${c.w / 2 - 90}" y="${card.headline.length > 1 ? 580 : 552}" width="180" height="7" rx="3.5" fill="${COBALT}"/>
    ${block(c, card.body, 700, 58, { size: 42, color: MUTED })}
    ${line(c, 'Gjej.  Krahaso.  Lëviz.', 985, { size: 44, weight: 700, color: COBALT, spacing: 1 })}`;
}

/** Die Ankuendigung, quadratisch oder hochkant. */
function announcement(canvas, { paper = false } = {}) {
  const ink = paper ? INK : WHITE;
  const muted = paper ? MUTED_LIGHT : MUTED;
  const story = canvas.h > canvas.w;

  // Bei der Story steht mehr Hoehe zur Verfuegung; alles rueckt auseinander.
  const y = story
    ? { mark: 300, head: 700, rule: 760, sub: 900, bullets: 1130, claim: 1560, wmTop: 520, wmHeight: 1200 }
    : { mark: 118, head: 430, rule: 472, sub: 580, bullets: 762, claim: 985, wmTop: 250, wmHeight: 900 };

  return `
    <rect width="${canvas.w}" height="${canvas.h}" fill="${paper ? PAPER : INK}"/>
    ${watermark(canvas, y.wmHeight, y.wmTop, COBALT, paper ? 0.09 : 0.07)}
    ${wordmark(canvas, 300, y.mark, ink)}
    ${line(canvas, 'SË SHPEJTI', y.head, { size: 118, weight: 700, spacing: 4, color: ink })}
    <rect x="${canvas.w / 2 - 90}" y="${y.rule}" width="180" height="7" rx="3.5" fill="${COBALT}"/>
    ${block(canvas, ['Tregu online i veturave', 'për Kosovë, Shqipëri dhe Maqedoni'], y.sub, 66, {
      size: 54,
      weight: 600,
      color: ink,
    })}
    ${bullets(canvas, FEATURES, y.bullets, 62, muted)}
    ${line(canvas, 'Gjej.  Krahaso.  Lëviz.', y.claim, { size: 44, weight: 700, color: COBALT, spacing: 1 })}`;
}

const VARIANTS = [
  { name: 'leviz-instagram-coming-soon', canvas: POST, body: announcement(POST) },
  { name: 'leviz-instagram-coming-soon-light', canvas: POST, body: announcement(POST, { paper: true }) },
  { name: 'leviz-instagram-story', canvas: STORY, body: announcement(STORY) },
  ...SERIES.map((card, index) => ({ name: card.name, canvas: POST, body: seriesCard(card, index) })),
];

for (const { name, canvas, body } of VARIANTS) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.w}" height="${canvas.h}" viewBox="0 0 ${canvas.w} ${canvas.h}">${body}</svg>`;

  writeFileSync(path.join(OUT_DIR, `${name}.svg`), `${svg}\n`);
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(path.join(OUT_DIR, `${name}.png`));

  console.log(`  ${name}  ${canvas.w}×${canvas.h}`);
}
