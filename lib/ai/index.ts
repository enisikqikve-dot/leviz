import type { Locale } from '@/lib/i18n/routing';

/**
 * KI-Funktionen hinter einer Schnittstelle.
 *
 * Der mitgelieferte Anbieter rechnet und formuliert selbst, statt einen Dienst
 * zu befragen. Das ist keine Notlösung: Beschreibung und Suchassistent
 * arbeiten auf den tatsächlichen Fahrzeugdaten und dem echten Marken- und
 * Modellkatalog. Dadurch ist beides ohne Zugangsschlüssel benutzbar,
 * nachvollziehbar und prüfbar — und ein Sprachmodell ersetzt später nur diese
 * eine Klasse.
 *
 * Erfundene Angaben sind ausgeschlossen: der Anbieter bekommt nur Felder, die
 * im Inserat stehen, und gibt nichts aus, was er nicht bekommen hat.
 */

export type DescriptionInput = {
  brand: string;
  model: string;
  variant?: string | null;
  year?: number | null;
  mileageKm?: number | null;
  fuel?: string | null;
  transmission?: string | null;
  powerKw?: number | null;
  bodyType?: string | null;
  doors?: number | null;
  seats?: number | null;
  color?: string | null;
  customsStatus?: string | null;
  plateOrigin?: string | null;
  importedFrom?: string | null;
  accidentFree?: boolean | null;
  serviceHistory?: boolean | null;
  ownersCount?: number | null;
  /** Anzeigenamen der Ausstattung in der Zielsprache. */
  features?: string[];
  locale: Locale;
};

/** Aus einem Freitext gelesene Filter. Alle Felder sind unsicher und optional. */
export type SearchIntent = {
  make?: string;
  model?: string;
  priceMax?: number;
  priceMin?: number;
  yearMin?: number;
  yearMax?: number;
  mileageMax?: number;
  fuel?: string[];
  transmission?: string[];
  bodyType?: string[];
  customs?: string[];
  plates?: string[];
  city?: string;
};

/** Womit der Assistent seine Treffer begründet — für die Anzeige. */
export type SearchIntentResult = {
  intent: SearchIntent;
  /** Erkannte Bruchstücke, in der Reihenfolge des Textes. */
  matched: string[];
  /** Wortteile, mit denen nichts anzufangen war. */
  ignored: string[];
};

export type AiCatalog = {
  /** Marken als `slug` → Anzeigename. */
  brands: Map<string, string>;
  /** Modelle als `slug` → { name, brandSlug }. */
  models: Map<string, { name: string; brandSlug: string }>;
  /** Städte als `slug` → Name. */
  cities: Map<string, string>;
};

export interface AiProvider {
  readonly name: string;
  /** Fließtext für ein Inserat, ausschließlich aus den übergebenen Feldern. */
  describe(input: DescriptionInput): Promise<string>;
  /** Freitext einer Suche in Filter übersetzen. */
  interpretSearch(text: string, locale: Locale, catalog: AiCatalog): Promise<SearchIntentResult>;
}

let provider: AiProvider | undefined;

export async function getAiProvider(): Promise<AiProvider> {
  if (provider) return provider;

  switch (process.env.AI_DRIVER ?? 'local') {
    case 'openai': {
      const { OpenAiProvider } = await import('./openai');
      provider = new OpenAiProvider();
      return provider;
    }
    case 'local':
    default: {
      const { LocalAiProvider } = await import('./local');
      provider = new LocalAiProvider();
      return provider;
    }
  }
}

/** Nur für Tests: erzwingt beim nächsten Zugriff eine neue Auswahl. */
export function resetAiProvider(): void {
  provider = undefined;
}
