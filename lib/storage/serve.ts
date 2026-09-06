import path from 'node:path';

/**
 * Wo die hochgeladenen Fotos auf der Platte liegen.
 *
 * Im Behaelter haengt an dieser Stelle ein dauerhafter Docker-Speicher, sonst
 * waeren die Bilder nach jedem Neustart weg (siehe docker-compose.yml).
 */
export const UPLOADS_ROOT = path.join(process.cwd(), 'public', 'uploads');

/**
 * Nur die Formate, die der Upload ueberhaupt annimmt — siehe
 * lib/storage/validate.ts. Was nicht in dieser Liste steht, wird nicht
 * ausgeliefert: eine als .jpg getarnte HTML-Datei bekaeme sonst ueber den
 * Umweg der Endung einen Inhaltstyp, den der Browser ausfuehrt.
 */
const CONTENT_TYPE: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
};

export type ResolvedUpload = { filePath: string; contentType: string };

/**
 * Bildet die Pfadteile aus der Adresse auf eine Datei im Speicher ab.
 *
 * Gibt `null` zurueck, sobald irgendetwas nicht stimmt — der Aufrufer
 * antwortet dann mit 404 und verraet nicht, woran es lag.
 *
 * Der Vergleich mit dem Wurzelverzeichnis ist der eigentliche Schutz: ein
 * Aufruf von /uploads/../../.env loest sich sonst zu einer Datei ausserhalb
 * des Speichers auf und gaebe die Geheimnisse der Anwendung preis.
 */
export function resolveUpload(
  segments: readonly string[],
  root: string = UPLOADS_ROOT,
): ResolvedUpload | null {
  if (segments.length === 0) return null;

  // Ein leerer Teil entsteht bei doppelten Schraegstrichen, ein Nullbyte ist
  // ein bekannter Trick, um Pruefungen auf die Endung zu umgehen.
  if (segments.some((part) => part.length === 0 || part.includes('\0'))) return null;

  const filePath = path.resolve(root, ...segments);
  if (!filePath.startsWith(path.resolve(root) + path.sep)) return null;

  const contentType = CONTENT_TYPE[path.extname(filePath).toLowerCase()];
  if (!contentType) return null;

  return { filePath, contentType };
}
