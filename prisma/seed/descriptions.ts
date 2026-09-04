import type { CustomsStatus } from '@/lib/generated/prisma/enums';

import type { Random } from './random';

export type DescriptionInput = {
  brand: string;
  model: string;
  variant: string;
  year: number;
  mileageKm: number;
  customsStatus: CustomsStatus;
  serviceHistory: boolean;
  accidentFree: boolean;
  importedFrom?: string;
  features: string[];
  isDealer: boolean;
  city: string;
};

const OPENINGS = [
  'Shitet {brand} {model} {variant}, viti {year}.',
  'Ofrohet {brand} {model} {variant} i vitit {year}.',
  '{brand} {model} {variant}, prodhim i vitit {year}, në shitje.',
];

const CONDITION_GOOD = [
  'Vetura është në gjendje shumë të mirë teknike dhe estetike.',
  'Gjendja e përgjithshme është e shkëlqyer, e mirëmbajtur rregullisht.',
  'Vetura mbahet si e re, pa asnjë defekt teknik.',
];

const CONDITION_FAIR = [
  'Vetura është në gjendje të mirë pune, me gjurmë normale përdorimi.',
  'Gjendja teknike është në rregull, estetikisht ka shenja të vogla nga përdorimi.',
];

const CUSTOMS_CLEARED = [
  'E doganuar dhe e gatshme për regjistrim.',
  'Të gjitha detyrimet doganore janë të kryera.',
  'E doganuar, dokumentacioni i plotë në rregull.',
];

const CUSTOMS_NOT_CLEARED = [
  'E padoganuar — çmimi është pa detyrimet doganore.',
  'Vetura është e padoganuar, ndihmojmë me procedurën nëse dëshironi.',
];

const SERVICE_YES = [
  'Me libër servisi të plotë, servisi i fundit i bërë së fundmi.',
  'Historia e servisit është e dokumentuar plotësisht.',
];

const ACCIDENT_FREE = [
  'Pa aksident, boja origjinale në të gjitha pjesët.',
  'Nuk ka pasur aksidente, e verifikueshme.',
];

const CLOSINGS_DEALER = [
  'Për më shumë informacione ose për të caktuar një takim, na kontaktoni. Ndodhemi në {city}.',
  'Mirë se vini në sallonin tonë në {city} për ta parë veturën nga afër.',
  'Mundësi këmbimi dhe financimi. Salloni ynë ndodhet në {city}.',
];

const CLOSINGS_PRIVATE = [
  'Vetura mund të shihet në {city}. Për çdo pyetje më kontaktoni.',
  'Ndodhem në {city}. Çmimi është pak i diskutueshëm për blerës serioz.',
  'Shitet për shkak të ndërrimit të veturës. Lokacioni: {city}.',
];

function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''));
}

/**
 * Setzt eine Verkaufsbeschreibung aus Bausteinen zusammen. Der Ton
 * unterscheidet sich zwischen Haendlern und Privatverkaeufern, so wie es auf
 * echten Marktplaetzen der Fall ist.
 */
export function buildDescription(random: Random, input: DescriptionInput): string {
  const values = {
    brand: input.brand,
    model: input.model,
    variant: input.variant,
    year: input.year,
    city: input.city,
  };

  const parts: string[] = [fill(random.pick(OPENINGS), values)];

  const wellKept = input.mileageKm < 150000 && input.accidentFree;
  parts.push(random.pick(wellKept ? CONDITION_GOOD : CONDITION_FAIR));

  if (input.customsStatus === 'CLEARED') parts.push(random.pick(CUSTOMS_CLEARED));
  else if (input.customsStatus === 'NOT_CLEARED') parts.push(random.pick(CUSTOMS_NOT_CLEARED));

  if (input.importedFrom) {
    parts.push(`E importuar nga ${input.importedFrom}.`);
  }

  if (input.serviceHistory) parts.push(random.pick(SERVICE_YES));
  if (input.accidentFree) parts.push(random.pick(ACCIDENT_FREE));

  if (input.features.length >= 3) {
    const highlighted = random.shuffle(input.features).slice(0, random.int(3, 5));
    parts.push(`Pajisje: ${highlighted.join(', ')}.`);
  }

  parts.push(
    fill(random.pick(input.isDealer ? CLOSINGS_DEALER : CLOSINGS_PRIVATE), values),
  );

  return parts.join(' ');
}
