/**
 * Was der Haendler nach dem Einlesen zu sehen bekommt.
 *
 * Steht bewusst nicht in `actions.ts`: das Modul dort traegt `'use server'`
 * und darf nur asynchrone Funktionen ausfuehren -- Konstanten und Typen
 * brauchen einen eigenen Platz, von dem aus auch die Oberflaeche sie liest.
 */

import type { ImportField } from './columns';
import type { ProblemCode } from './rows';

/**
 * Wie viele Zeilen ein Durchgang verarbeitet.
 *
 * Die Grenze ist keine Willkuer: fuer jedes Fahrzeug werden Fotos von fremden
 * Servern geholt. Bei hundert Fahrzeugen mit je zehn Fotos sind das tausend
 * Abrufe, und der Haendler sitzt vor einer Seite, die sich nicht ruehrt. Wer
 * mehr hat, laedt die Datei ein zweites Mal -- bereits angelegte Fahrzeuge
 * erkennt der Import an der Fahrgestellnummer.
 */
export const MAX_IMPORT_ROWS = 100;

/** Wie viele Zeilen gleichzeitig verarbeitet werden. */
export const IMPORT_CONCURRENCY = 4;

export type ImportProblemCode =
  | ProblemCode
  | 'unknownBrand'
  | 'unknownModel'
  | 'unknownCity'
  | 'duplicateVin';

export type ImportProblem = {
  field: ImportField;
  code: ImportProblemCode;
  /** Freitext daneben — etwa die Modelle, die es bei dieser Marke gibt. */
  detail?: string;
};

export type ImportRowReport = {
  line: number;
  /** "BMW 3er · 2018" — damit der Haendler die Zeile wiedererkennt. */
  label: string;
  problems: ImportProblem[];
  descriptionGenerated: boolean;
  imageCount: number;
};

export type ImportAnalysis = {
  totalRows: number;
  readyCount: number;
  unknownColumns: string[];
  missingColumns: ImportField[];
  rows: ImportRowReport[];
  /** Wie viele Inserate das Paket noch zulaesst. `null` heisst unbegrenzt. */
  freeSlots: number | null;
  photoLimit: number;
};

export type ImportRunResult = {
  created: number;
  published: number;
  /** Zeilen, die trotz gueltiger Angaben nicht angelegt werden konnten. */
  failed: { line: number; label: string; reason: string }[];
  /** Fotos, die nicht geladen werden konnten, je Zeile. */
  imageWarnings: { line: number; label: string; failed: number }[];
  skippedForLimit: number;
};
