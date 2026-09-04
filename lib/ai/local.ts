import type { Locale } from '@/lib/i18n/routing';

import type {
  AiCatalog,
  AiProvider,
  DescriptionInput,
  SearchIntent,
  SearchIntentResult,
} from './index';

/**
 * Der mitgelieferte Anbieter.
 *
 * Er formuliert und liest selbst, ohne einen Dienst zu befragen. Für beide
 * Aufgaben ist das der ehrlichere Weg als ein Platzhalter: Die Beschreibung
 * entsteht ausschließlich aus Feldern, die im Inserat stehen — sie kann daher
 * nichts erfinden, was ein Sprachmodell sehr wohl könnte. Und der Suchtext
 * wird gegen den echten Marken-, Modell- und Städtekatalog gelesen, nicht
 * geraten.
 */

/** Textbausteine je Sprache. */
const PHRASES = {
  sq: {
    fromYear: (year: number) => `nga viti ${year}`,
    mileage: (km: string) => `me ${km} km`,
    power: (hp: string) => `${hp} kf`,
    doorsSeats: (doors: number, seats: number) => `${doors} dyer, ${seats} ulëse`,
    color: (color: string) => `Ngjyra: ${color}.`,
    cleared: 'Vetura është e doganuar.',
    notCleared: 'Vetura nuk është e doganuar.',
    plates: (plate: string) => `Targa ${plate}.`,
    importedFrom: (country: string) => `E importuar nga ${country}.`,
    accidentFree: 'Pa aksidente.',
    serviceHistory: 'Me libër servisi.',
    owners: (count: number) =>
      count === 1 ? 'Një pronar i vetëm.' : `${count} pronarë deri tani.`,
    featuresLabel: 'Pajisje',
    closing: 'Për pyetje ose takim, shkruani përmes portalit.',
  },
  de: {
    fromYear: (year: number) => `aus dem Jahr ${year}`,
    mileage: (km: string) => `mit ${km} km`,
    power: (hp: string) => `${hp} PS`,
    doorsSeats: (doors: number, seats: number) => `${doors} Türen, ${seats} Sitze`,
    color: (color: string) => `Farbe: ${color}.`,
    cleared: 'Das Fahrzeug ist verzollt.',
    notCleared: 'Das Fahrzeug ist nicht verzollt.',
    plates: (plate: string) => `Kennzeichen ${plate}.`,
    importedFrom: (country: string) => `Import aus ${country}.`,
    accidentFree: 'Unfallfrei.',
    serviceHistory: 'Mit Scheckheft.',
    owners: (count: number) =>
      count === 1 ? 'Erste Hand.' : `${count} Vorbesitzer.`,
    featuresLabel: 'Ausstattung',
    closing: 'Für Fragen oder einen Besichtigungstermin gerne über das Portal melden.',
  },
  en: {
    fromYear: (year: number) => `from ${year}`,
    mileage: (km: string) => `with ${km} km`,
    power: (hp: string) => `${hp} hp`,
    doorsSeats: (doors: number, seats: number) => `${doors} doors, ${seats} seats`,
    color: (color: string) => `Colour: ${color}.`,
    cleared: 'The vehicle is customs cleared.',
    notCleared: 'The vehicle is not customs cleared.',
    plates: (plate: string) => `${plate} plates.`,
    importedFrom: (country: string) => `Imported from ${country}.`,
    accidentFree: 'Accident free.',
    serviceHistory: 'Full service history.',
    owners: (count: number) =>
      count === 1 ? 'One owner from new.' : `${count} previous owners.`,
    featuresLabel: 'Equipment',
    closing: 'Message me through the portal for questions or a viewing.',
  },
} as const satisfies Record<Locale, Record<string, unknown>>;

/** Tausendertrennung wie im übrigen Portal, ohne Intl. */
function group(value: number, separator: string): string {
  const digits = String(Math.round(Math.abs(value)));
  let out = '';
  for (let i = 0; i < digits.length; i += 1) {
    if (i > 0 && (digits.length - i) % 3 === 0) out += separator;
    out += digits[i];
  }
  return out;
}

const GROUP_SEPARATOR: Record<Locale, string> = { sq: '.', de: '.', en: ',' };

const kwToHp = (kw: number) => Math.round(kw * 1.35962);

/** Fügt Sätze zusammen und lässt Lücken weg, statt sie zu füllen. */
function join(parts: (string | null | undefined)[], separator = ' '): string {
  return parts.filter((part): part is string => Boolean(part && part.trim())).join(separator);
}

export class LocalAiProvider implements AiProvider {
  readonly name = 'local';

  async describe(input: DescriptionInput): Promise<string> {
    const p = PHRASES[input.locale];
    const sep = GROUP_SEPARATOR[input.locale];

    // --- Erster Satz: was es ist ------------------------------------------
    const title = join([input.brand, input.model, input.variant]);
    const opening = join([
      title,
      input.year ? p.fromYear(input.year) : null,
      input.mileageKm !== null && input.mileageKm !== undefined
        ? p.mileage(group(input.mileageKm, sep))
        : null,
    ]);

    // --- Zweiter Satz: die Technik -----------------------------------------
    const technical = join(
      [
        input.fuel,
        input.transmission,
        input.powerKw ? p.power(group(kwToHp(input.powerKw), sep)) : null,
        input.bodyType,
        input.doors && input.seats ? p.doorsSeats(input.doors, input.seats) : null,
      ],
      ', ',
    );

    // --- Dritter Absatz: die regionalen Angaben ----------------------------
    const regional = join([
      input.customsStatus === 'CLEARED' ? p.cleared : null,
      input.customsStatus === 'NOT_CLEARED' ? p.notCleared : null,
      input.plateOrigin && input.plateOrigin !== 'NONE' ? p.plates(input.plateOrigin) : null,
      input.importedFrom ? p.importedFrom(input.importedFrom) : null,
    ]);

    // --- Vierter Absatz: der Zustand ---------------------------------------
    const condition = join([
      input.accidentFree ? p.accidentFree : null,
      input.serviceHistory ? p.serviceHistory : null,
      input.ownersCount ? p.owners(input.ownersCount) : null,
      input.color ? p.color(input.color) : null,
    ]);

    // Nur die ersten acht Merkmale: eine vollständige Liste steht ohnehin
    // strukturiert im Inserat und würde den Fließtext unlesbar machen.
    const features =
      input.features && input.features.length > 0
        ? `${p.featuresLabel}: ${input.features.slice(0, 8).join(', ')}.`
        : null;

    return join(
      [
        opening ? `${opening}.` : null,
        technical ? `${technical}.` : null,
        regional,
        condition,
        features,
        p.closing,
      ],
      '\n\n',
    );
  }

  async interpretSearch(
    text: string,
    locale: Locale,
    catalog: AiCatalog,
  ): Promise<SearchIntentResult> {
    return interpretSearchText(text, locale, catalog);
  }
}

// ---------------------------------------------------------------------------
// Freitext lesen
// ---------------------------------------------------------------------------

/** Diakritika entfernen, damit „Prishtinë“ auch als „prishtine“ trifft. */
export function fold(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ë/g, 'e')
    .replace(/ç/g, 'c');
}

/** Stichwörter je Filterwert, in allen drei Sprachen. */
const FUEL_WORDS: Record<string, string[]> = {
  DIESEL: ['nafte', 'naftë', 'diesel', 'dizel'],
  PETROL: ['benzine', 'benzinë', 'benzin', 'petrol', 'gasoline'],
  LPG: ['lpg', 'gaz', 'autogas'],
  CNG: ['cng', 'metan'],
  ELECTRIC: ['elektrik', 'elektro', 'electric', 'ev'],
  PLUGIN_HYBRID: ['plug-in', 'plugin', 'phev'],
  HYBRID_PETROL: ['hibrid', 'hybrid'],
};

const TRANSMISSION_WORDS: Record<string, string[]> = {
  AUTOMATIC: ['automatik', 'automatike', 'automatik.', 'automatic', 'automatikisht'],
  MANUAL: ['manual', 'manuale', 'manuell', 'schalter'],
  SEMI_AUTOMATIC: ['gjysme-automatik', 'halbautomatik', 'semi-automatic'],
};

const BODY_WORDS: Record<string, string[]> = {
  SUV: ['suv', 'xhip', 'jeep', 'gelaendewagen', 'gelandewagen'],
  ESTATE: ['karavan', 'kombi', 'estate', 'station'],
  SEDAN: ['limuzine', 'limousine', 'sedan'],
  HATCHBACK: ['hatchback', 'fliessheck', 'fliessheck'],
  COUPE: ['kupe', 'coupe'],
  CONVERTIBLE: ['kabriolet', 'cabrio', 'convertible'],
  VAN: ['furgon', 'transporter', 'van'],
  PICKUP: ['pickup', 'pick-up'],
};

const CUSTOMS_WORDS: Record<string, string[]> = {
  // Die Verneinung zuerst prüfen, sonst trifft „doganuar“ auch in „padoganuar“.
  NOT_CLEARED: ['i padoganuar', 'padoganuar', 'pa dogane', 'unverzollt', 'not cleared'],
  CLEARED: ['i doganuar', 'doganuar', 'me dogane', 'verzollt', 'cleared'],
};

const PLATE_WORDS: Record<string, string[]> = {
  RKS: ['targa rks', 'rks', 'kosove', 'kosovare'],
  AL: ['targa al', 'targa shqiptare', 'shqiptare'],
  MK: ['targa mk', 'maqedonase'],
  FOREIGN: ['targa te huaja', 'te huaja', 'auslaendisch', 'foreign plates'],
};

/** Zahlen samt Kurzform: „5k“, „5 mijë“, „5.000“. */
function readNumber(raw: string): number | null {
  const cleaned = raw.replace(/[.\s']/g, '').replace(',', '.');
  const match = cleaned.match(/^(\d+(?:\.\d+)?)(k|mije|mijë|tsd)?$/i);
  if (!match) return null;

  const value = Number(match[1]);
  if (!Number.isFinite(value)) return null;

  return match[2] ? Math.round(value * 1000) : Math.round(value);
}

/** Wörter, die eine Obergrenze ankündigen. */
const UPPER = ['deri', 'nen', 'nën', 'max', 'maksimum', 'bis', 'unter', 'under', 'up to', 'hoechstens'];
const LOWER = ['nga', 'mbi', 'min', 'minimum', 'ab', 'from', 'over', 'ueber'];

/**
 * Liest einen Suchtext in Filter.
 *
 * Absichtlich konservativ: Was nicht sicher erkannt wird, landet in `ignored`
 * und wird dem Nutzer gezeigt, statt stillschweigend geraten zu werden. Eine
 * falsch gesetzte Preisgrenze wäre schlimmer als eine nicht gesetzte.
 */
export function interpretSearchText(
  text: string,
  locale: Locale,
  catalog: AiCatalog,
): SearchIntentResult {
  const intent: SearchIntent = {};
  const matched: string[] = [];
  const folded = ` ${fold(text)} `;

  let rest = folded;
  const consume = (needle: string, label: string) => {
    rest = rest.replace(needle, ' ');
    matched.push(label);
  };

  // --- Marke und Modell --------------------------------------------------
  // Längere Namen zuerst, damit „range rover“ nicht als „rover“ endet.
  const brandEntries = [...catalog.brands.entries()].sort(
    (a, b) => b[1].length - a[1].length,
  );
  for (const [slug, name] of brandEntries) {
    const needle = ` ${fold(name)} `;
    if (rest.includes(needle)) {
      intent.make = slug;
      consume(needle, name);
      break;
    }
  }

  const modelEntries = [...catalog.models.entries()].sort(
    (a, b) => b[1].name.length - a[1].name.length,
  );
  for (const [slug, model] of modelEntries) {
    if (intent.make && model.brandSlug !== intent.make) continue;

    const needle = ` ${fold(model.name)} `;
    if (rest.includes(needle)) {
      intent.model = slug;
      // Ohne genannte Marke ergibt sie sich aus dem Modell.
      intent.make ??= model.brandSlug;
      consume(needle, model.name);
      break;
    }
  }

  // --- Stadt --------------------------------------------------------------
  for (const [slug, name] of catalog.cities) {
    const needle = ` ${fold(name)} `;
    if (rest.includes(needle)) {
      intent.city = slug;
      consume(needle, name);
      break;
    }
  }

  // --- Stichwörter --------------------------------------------------------
  const pickWords = (
    table: Record<string, string[]>,
    assign: (value: string) => void,
  ) => {
    for (const [value, words] of Object.entries(table)) {
      for (const word of words) {
        const needle = ` ${fold(word)} `;
        if (rest.includes(needle)) {
          assign(value);
          consume(needle, word);
          break;
        }
      }
    }
  };

  pickWords(CUSTOMS_WORDS, (value) => {
    // Nur der erste Treffer zählt; „i padoganuar“ steht vor „i doganuar“.
    intent.customs ??= [value];
  });
  pickWords(FUEL_WORDS, (value) => {
    (intent.fuel ??= []).push(value);
  });
  pickWords(TRANSMISSION_WORDS, (value) => {
    (intent.transmission ??= []).push(value);
  });
  pickWords(BODY_WORDS, (value) => {
    (intent.bodyType ??= []).push(value);
  });
  pickWords(PLATE_WORDS, (value) => {
    (intent.plates ??= []).push(value);
  });

  // --- Zahlen mit Einheit -------------------------------------------------
  // Kilometerstand und Baujahr sind eindeutig; beim Preis entscheidet das
  // Wort davor, ob es eine Ober- oder Untergrenze ist.
  const numberPattern = /(\S+)?\s*(\d[\d.,\s']*)\s*(km|kilometra|kilometer|€|eur|euro|tkm|k)?/gi;

  // Was hier verarbeitet wird, verschwindet aus `rest` — sonst meldete der
  // Assistent hinterher „euro“ als nicht verstanden, obwohl er die Zahl
  // gerade als Preis gelesen hat.
  const usedNumbers: string[] = [];

  for (const match of [...rest.matchAll(numberPattern)]) {
    const [whole, before = '', digits, unit = ''] = match;
    const value = readNumber(unit === 'k' || unit === 'tkm' ? `${digits}k` : digits);
    if (value === null || value === 0) continue;

    usedNumbers.push(whole);

    const prefix = fold(before);
    const isUpper = UPPER.some((word) => prefix.includes(fold(word)));
    const isLower = LOWER.some((word) => prefix.includes(fold(word)));

    if (/km|kilometra|kilometer|tkm/i.test(unit)) {
      intent.mileageMax = value;
      matched.push(whole.trim());
      continue;
    }

    // Vierstellige Zahlen im plausiblen Bereich sind ein Baujahr.
    if (!unit && value >= 1950 && value <= new Date().getFullYear() + 1) {
      if (isUpper) intent.yearMax = value;
      else intent.yearMin = value;
      matched.push(whole.trim());
      continue;
    }

    if (/€|eur|euro/i.test(unit) || isUpper || isLower) {
      if (isLower) intent.priceMin = value;
      else intent.priceMax = value;
      matched.push(whole.trim());
    }
  }

  // --- Was übrig blieb ----------------------------------------------------
  let leftover = rest;
  for (const used of usedNumbers) leftover = leftover.replace(used, ' ');

  // Füllwörter, die keine Absicht tragen und deshalb nicht als „nicht
  // verstanden“ gemeldet werden sollen.
  const FILLER = new Set([
    ...UPPER, ...LOWER,
    'euro', 'eur', 'km', 'kilometra', 'kilometer',
    'ne', 'në', 'in', 'im', 'me', 'mit', 'with', 'und', 'and', 'dhe', 'der', 'die', 'das',
  ]);

  const ignored = leftover
    .split(/[\s,;.]+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 2 && !/^\d+$/.test(word))
    .filter((word) => !FILLER.has(word))
    .slice(0, 6);

  return { intent, matched, ignored };
}
