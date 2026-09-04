import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Aus einem Modul mit `'use server'` darf nur exportiert werden, was eine
 * asynchrone Funktion ist. Alles andere — eine Konstante, ein Array, eine
 * synchrone Hilfsfunktion — kommt im Browser als Platzhalter an und scheitert
 * erst zur Laufzeit.
 *
 * Dieser Fehler ist im Projekt zweimal aufgetreten: `MAX_COMPARE` brach den
 * Produktionsbuild, `REPORT_REASONS` liess die Fahrzeugseite mit 500
 * antworten. Der Compiler faengt beides nicht.
 */

const ROOT = path.join(import.meta.dirname, '..');
const SEARCH_DIRS = ['app', 'features', 'lib'];
const SKIP = new Set(['node_modules', '.next', 'generated', '__tests__']);

function collect(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (SKIP.has(entry)) continue;

    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) collect(full, found);
    else if (/\.tsx?$/.test(entry) && !entry.endsWith('.test.ts')) found.push(full);
  }
  return found;
}

/** Alle Dateien, die mit der Server-Action-Anweisung beginnen. */
function serverActionFiles(): string[] {
  return SEARCH_DIRS.flatMap((dir) => collect(path.join(ROOT, dir))).filter((file) => {
    const head = readFileSync(file, 'utf8').slice(0, 200);
    return /^\s*['"]use server['"]/.test(head);
  });
}

/** Exporte, die kein `async function` und kein reiner Typ sind. */
function forbiddenExports(source: string): string[] {
  const found: string[] = [];

  for (const line of source.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('export')) continue;

    // Erlaubt: asynchrone Funktionen und alles, was nur ein Typ ist.
    if (/^export\s+async\s+function\s/.test(trimmed)) continue;
    if (/^export\s+(type|interface)\s/.test(trimmed)) continue;
    if (/^export\s+\{[^}]*\}\s+from/.test(trimmed) && trimmed.includes('type ')) continue;
    if (/^export\s+\*\s+from/.test(trimmed)) continue;

    found.push(trimmed.slice(0, 90));
  }

  return found;
}

describe('Server Actions exportieren nur asynchrone Funktionen', () => {
  const files = serverActionFiles();

  it('findet die Server-Action-Dateien des Projekts', () => {
    expect(files.length).toBeGreaterThan(3);
  });

  for (const file of files) {
    const relative = path.relative(ROOT, file).replaceAll('\\', '/');

    it(`${relative} exportiert nichts Unerlaubtes`, () => {
      const offenders = forbiddenExports(readFileSync(file, 'utf8'));

      expect(
        offenders,
        `${relative}: diese Exporte kommen im Browser als Platzhalter an:\n  ${offenders.join('\n  ')}`,
      ).toEqual([]);
    });
  }
});
