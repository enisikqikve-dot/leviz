/**
 * Holt ein Fahrzeugfoto von einer Adresse aus der Haendlerdatei.
 *
 * Das ist die heikelste Stelle des Imports: der Server ruft eine Adresse auf,
 * die jemand anderes bestimmt hat. Ohne Schranken laesst sich damit von aussen
 * abfragen, was nur von innen erreichbar ist -- die Datenbank auf 127.0.0.1,
 * ein Nachbardienst im Docker-Netz, bei einem Anbieter der Metadatendienst
 * unter 169.254.169.254, der Zugangsschluessel herausgibt.
 *
 * Deshalb drei Schranken: nur http und https, keine Adresse, die auf einen
 * internen Bereich zeigt, und eine Groessen- und Zeitgrenze. Geprueft wird
 * zusaetzlich der Inhalt der Datei, nicht ihre Endung -- eine umbenannte
 * ausfuehrbare Datei kaeme sonst als Fahrzeugfoto durch.
 */

import { lookup } from 'node:dns/promises';

import { MAX_IMAGE_BYTES, validateImage, type ImageFormat } from '@/lib/storage/validate';

/** Wie lange auf eine Antwort gewartet wird. */
const TIMEOUT_MS = 15_000;

/**
 * Zeigt diese Adresse auf einen Bereich, der nicht von aussen stammt?
 *
 * Geprueft werden Zeichenketten, nicht Netzwerkverhalten -- der Aufrufer muss
 * zusaetzlich den aufgeloesten Namen pruefen.
 */
export function isBlockedAddress(host: string): boolean {
  const name = host.toLowerCase().replace(/^\[|\]$/g, '');

  if (name === '' || name === 'localhost' || name.endsWith('.localhost')) return true;
  // Rechnernamen ohne Punkt sind im Netz nicht aufloesbar und meinen einen
  // Nachbarn im selben Docker-Netz.
  if (!name.includes('.') && !name.includes(':')) return true;

  // IPv6
  if (name.includes(':')) {
    if (name === '::1' || name === '::') return true;
    // Eindeutig lokale und verbindungslokale Bereiche.
    if (/^f[cd]/.test(name)) return true;
    if (name.startsWith('fe80')) return true;
    // In IPv6 eingebettete IPv4-Adresse.
    const eingebettet = name.match(/((\d{1,3}\.){3}\d{1,3})$/);
    if (eingebettet) return isBlockedAddress(eingebettet[1]!);
    return false;
  }

  const teile = name.split('.');
  if (teile.length === 4 && teile.every((teil) => /^\d{1,3}$/.test(teil))) {
    const [a, b] = teile.map(Number) as [number, number, number, number];

    if (a === 0 || a === 127) return true;          // dieses Netz, Rueckschleife
    if (a === 10) return true;                      // privat
    if (a === 172 && b >= 16 && b <= 31) return true; // privat
    if (a === 192 && b === 168) return true;        // privat
    if (a === 169 && b === 254) return true;        // verbindungslokal, Metadaten
    if (a === 100 && b >= 64 && b <= 127) return true; // Anbieter-internes Netz
    if (a >= 224) return true;                      // Mehrfachadressen, reserviert
  }

  return false;
}

export type RemoteImageError =
  | 'badUrl'
  | 'blockedHost'
  | 'unreachable'
  | 'notFound'
  | 'tooLarge'
  | 'notAnImage';

export type RemoteImage =
  | { ok: true; bytes: Uint8Array; format: ImageFormat; mime: string }
  | { ok: false; error: RemoteImageError };

/**
 * Prueft die Adresse, bevor irgendetwas geladen wird.
 *
 * Der Name wird aufgeloest, weil sonst ein Eintrag wie
 * `bilder.beispiel.com -> 127.0.0.1` an der Zeichenpruefung vorbeikaeme.
 *
 * Zwischen dieser Pruefung und dem eigentlichen Abruf loest der Rechner den
 * Namen ein zweites Mal auf; wer den Eintrag genau dazwischen aendert, kaeme
 * durch. Dagegen hilft nur, die Verbindung selbst an die gepruefte Adresse zu
 * binden. Fuer einen Import, den nur angemeldete Haendler ausloesen koennen,
 * ist der Aufwand nicht angemessen -- die Luecke steht hier, damit sie bekannt
 * ist und nicht fuer Sicherheit gehalten wird.
 */
export async function checkImageUrl(raw: string): Promise<RemoteImageError | null> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return 'badUrl';
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return 'badUrl';
  if (isBlockedAddress(url.hostname)) return 'blockedHost';

  try {
    const adressen = await lookup(url.hostname, { all: true });
    if (adressen.some((eintrag) => isBlockedAddress(eintrag.address))) return 'blockedHost';
  } catch {
    return 'unreachable';
  }

  return null;
}

export async function fetchRemoteImage(raw: string): Promise<RemoteImage> {
  const schranke = await checkImageUrl(raw);
  if (schranke) return { ok: false, error: schranke };

  const abbruch = AbortSignal.timeout(TIMEOUT_MS);

  let antwort: Response;
  try {
    antwort = await fetch(raw, {
      signal: abbruch,
      // Eine Weiterleitung koennte auf eine interne Adresse zeigen. Wir folgen
      // ihr nicht; der Haendler traegt dann die echte Adresse ein.
      redirect: 'error',
      headers: { accept: 'image/*' },
    });
  } catch {
    return { ok: false, error: 'unreachable' };
  }

  if (!antwort.ok) return { ok: false, error: 'notFound' };

  // Meldet der Server eine Groesse, wird sie geglaubt und frueh abgebrochen.
  const gemeldet = Number(antwort.headers.get('content-length') ?? '');
  if (Number.isFinite(gemeldet) && gemeldet > MAX_IMAGE_BYTES) {
    return { ok: false, error: 'tooLarge' };
  }

  let bytes: Uint8Array;
  try {
    const puffer = await antwort.arrayBuffer();
    bytes = new Uint8Array(puffer);
  } catch {
    return { ok: false, error: 'unreachable' };
  }

  // Und noch einmal nach dem Laden: die gemeldete Groesse kann fehlen oder
  // gelogen sein.
  if (bytes.byteLength > MAX_IMAGE_BYTES) return { ok: false, error: 'tooLarge' };

  const geprueft = validateImage(bytes);
  if (!geprueft.ok) return { ok: false, error: 'notAnImage' };

  return { ok: true, bytes, format: geprueft.format, mime: geprueft.mime };
}
