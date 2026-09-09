/**
 * Liest eine CSV-Datei so, wie sie bei Haendlern tatsaechlich vom Rechner kommt.
 *
 * Es gibt fertige Bibliotheken dafuer. Der Grund, es hier trotzdem selbst zu
 * machen, ist die Herkunft der Dateien: sie kommen aus Excel, und Excel auf
 * einem Rechner mit deutscher, albanischer oder mazedonischer Einstellung
 * schreibt Semikolon statt Komma und haengt eine Byte-Reihenfolge-Markierung an
 * den Anfang. Wer das nicht beruecksichtigt, liest eine einzige Spalte ein und
 * meldet dem Haendler, seine Datei sei kaputt -- dabei ist sie voellig normal.
 */

export type CsvRow = {
  /** Zeilennummer in der Datei, wie sie der Haendler in Excel sieht. */
  line: number;
  cells: string[];
};

export type CsvTable = {
  delimiter: string;
  header: string[];
  rows: CsvRow[];
};

const DELIMITERS = [';', ',', '\t'] as const;

/**
 * Welches Trennzeichen die Datei benutzt.
 *
 * Entschieden wird an der Kopfzeile, und zwar ausserhalb von Anfuehrungszeichen:
 * ein Feld wie "Mercedes-Benz, C-Klasse" enthaelt selbst ein Komma und wuerde
 * sonst die Zaehlung verfaelschen.
 */
export function detectDelimiter(firstLine: string): string {
  let bestes = ';';
  let meiste = -1;

  for (const kandidat of DELIMITERS) {
    let anzahl = 0;
    let inAnfuehrung = false;

    for (let i = 0; i < firstLine.length; i++) {
      const zeichen = firstLine[i];
      if (zeichen === '"') inAnfuehrung = !inAnfuehrung;
      else if (!inAnfuehrung && zeichen === kandidat) anzahl++;
    }

    if (anzahl > meiste) {
      meiste = anzahl;
      bestes = kandidat;
    }
  }

  return bestes;
}

/**
 * Zerlegt den gesamten Text in Zeilen und Felder.
 *
 * Anfuehrungszeichen gelten nach der ueblichen Regel: innerhalb steht alles
 * woertlich -- auch Trennzeichen und Zeilenumbrueche -- und zwei
 * Anfuehrungszeichen hintereinander bedeuten eines.
 */
function zerlege(text: string, delimiter: string): string[][] {
  const zeilen: string[][] = [];
  let zeile: string[] = [];
  let feld = '';
  let inAnfuehrung = false;

  for (let i = 0; i < text.length; i++) {
    const zeichen = text[i];

    if (inAnfuehrung) {
      if (zeichen === '"') {
        if (text[i + 1] === '"') {
          feld += '"';
          i++;
        } else {
          inAnfuehrung = false;
        }
      } else {
        feld += zeichen;
      }
      continue;
    }

    if (zeichen === '"') {
      inAnfuehrung = true;
    } else if (zeichen === delimiter) {
      zeile.push(feld);
      feld = '';
    } else if (zeichen === '\n') {
      zeile.push(feld);
      zeilen.push(zeile);
      zeile = [];
      feld = '';
    } else if (zeichen === '\r') {
      // Windows-Zeilenende: das \n danach erledigt den Umbruch.
    } else {
      feld += zeichen;
    }
  }

  // Letzte Zeile ohne abschliessenden Umbruch.
  if (feld !== '' || zeile.length > 0) {
    zeile.push(feld);
    zeilen.push(zeile);
  }

  return zeilen;
}

/** Ist die Zeile vollstaendig leer? Solche Zeilen haengen oft am Dateiende. */
function istLeer(cells: string[]): boolean {
  return cells.every((cell) => cell.trim() === '');
}

export function parseCsv(input: string): CsvTable {
  // Byte-Reihenfolge-Markierung von Excel. Bleibt sie stehen, heisst die erste
  // Spalte "﻿Marke" und wird nicht wiedererkannt.
  const text = input.replace(/^﻿/, '');

  const ersteZeile = text.split(/\r?\n/, 1)[0] ?? '';
  const delimiter = detectDelimiter(ersteZeile);

  const alle = zerlege(text, delimiter);
  if (alle.length === 0) return { delimiter, header: [], rows: [] };

  const header = (alle[0] ?? []).map((cell) => cell.trim());

  const rows: CsvRow[] = [];
  for (let i = 1; i < alle.length; i++) {
    const cells = alle[i] ?? [];
    if (istLeer(cells)) continue;
    // +1, weil die Kopfzeile in Excel Zeile 1 ist.
    rows.push({ line: i + 1, cells: cells.map((cell) => cell.trim()) });
  }

  return { delimiter, header, rows };
}
