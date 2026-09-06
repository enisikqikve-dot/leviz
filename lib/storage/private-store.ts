import { randomBytes } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Speicher fuer Ausweisbelege.
 *
 * Liegt mit Absicht ausserhalb von `public/`. Was dort liegt, ist mit der
 * blossen Adresse abrufbar — bei einem Fahrzeugfoto ist das der Sinn, bei
 * einem Ausweis waere es der Schaden. Belege kommen nur ueber eine Route
 * heraus, die vorher prueft, wer fragt.
 *
 * Im Behaelter haengt an dieser Stelle ein eigener dauerhafter Speicher, damit
 * ein laufender Antrag ein Neubauen ueberlebt.
 */
export const VERIFICATION_ROOT = path.join(process.cwd(), 'var', 'verification');

/**
 * Der Schluessel traegt die Nutzerkennung als Ordner: so lassen sich die
 * Belege eines Antragstellers zusammen loeschen, ohne die Datenbank zu fragen.
 * Der Zufallsanteil verhindert, dass jemand einen Schluessel erraet.
 */
export function buildDocumentKey(userId: string, extension: string): string {
  return `${userId}/${Date.now().toString(36)}-${randomBytes(12).toString('hex')}.${extension}`;
}

/**
 * Loest einen Schluessel zu einem Pfad auf und stellt sicher, dass er im
 * Speicher bleibt.
 *
 * Die Schluessel stammen zwar aus der eigenen Datenbank, aber ein Fehler an
 * anderer Stelle darf hier nicht dazu fuehren, dass `../../.env` lesbar wird.
 */
export function resolveDocumentPath(
  key: string,
  root: string = VERIFICATION_ROOT,
): string | null {
  if (key.length === 0 || key.includes('\0')) return null;

  const target = path.resolve(root, key);
  if (!target.startsWith(path.resolve(root) + path.sep)) return null;

  return target;
}

export async function putDocument(key: string, bytes: Uint8Array): Promise<void> {
  const target = resolveDocumentPath(key);
  if (!target) throw new Error('Ungueltiger Schluessel');

  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, bytes, { mode: 0o600 });
}

export async function readDocument(key: string): Promise<Buffer | null> {
  const target = resolveDocumentPath(key);
  if (!target) return null;

  try {
    // Der Hinweis an den Uebersetzer ist noetig, nicht kosmetisch: ohne ihn
    // haelt er diesen Zugriff fuer unbestimmt und legt vorsichtshalber das
    // ganze Projekt mit ins Betriebs-Abbild -- samt oeffentlichem Ordner und
    // allen Quelldateien. Der Pfad ist durch resolveDocumentPath auf das
    // Belegverzeichnis festgenagelt.
    return await readFile(/*turbopackIgnore: true*/ target);
  } catch {
    return null;
  }
}

/** Eine bereits entfernte Datei ist kein Fehler. */
export async function removeDocument(key: string): Promise<void> {
  const target = resolveDocumentPath(key);
  if (!target) return;

  await rm(target, { force: true });
}
