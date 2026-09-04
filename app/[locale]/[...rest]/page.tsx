import { notFound } from 'next/navigation';

/**
 * Ohne diese Auffangroute lösen unbekannte Pfade die sprachunabhängige
 * `app/not-found.tsx` aus — also eine Seite ohne Kopf- und Fußbereich.
 * Sie zieht solche Adressen in den Sprachzweig, damit die übersetzte
 * 404-Seite mitsamt Navigation erscheint.
 */
export default function CatchAllNotFound() {
  notFound();
}
