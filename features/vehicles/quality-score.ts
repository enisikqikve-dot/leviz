/**
 * Bewertet die Vollstaendigkeit eines Inserats von 0 bis 100 und leitet daraus
 * konkrete Verbesserungsvorschlaege ab. Der Wert fliesst in die Reihung der
 * Suchergebnisse ein — gut gepflegte Inserate stehen weiter oben, ohne dass
 * dafuer bezahlt werden muss.
 */

export type QualityInput = {
  photoCount: number;
  descriptionLength: number;
  featureCount: number;
  hasMileage: boolean;
  hasFirstRegistration: boolean;
  hasFuel: boolean;
  hasTransmission: boolean;
  hasPower: boolean;
  hasBodyType: boolean;
  hasDriveType: boolean;
  hasColor: boolean;
  hasCustomsStatus: boolean;
  hasServiceHistory: boolean;
  hasAccidentInfo: boolean;
  hasVin: boolean;
  sellerVerified: boolean;
};

export type QualityHint = {
  /** Schluessel in der Uebersetzungsdatei unter vehicles.quality. */
  key: string;
  /** Platzhalterwerte fuer den Hinweistext. */
  values?: Record<string, number>;
  /** Wie viele Punkte dieser Schritt bringt. */
  gain: number;
};

export type QualityResult = {
  score: number;
  hints: QualityHint[];
};

/** Ab dieser Anzahl gilt die Bildstrecke als vollstaendig. */
const IDEAL_PHOTOS = 8;
const MIN_DESCRIPTION = 220;
const IDEAL_FEATURES = 10;

const WEIGHTS = {
  photos: 24,
  description: 16,
  technical: 22,
  features: 12,
  history: 14,
  customs: 8,
  verified: 4,
} as const;

export function calculateQualityScore(input: QualityInput): QualityResult {
  const hints: QualityHint[] = [];

  // --- Fotos ---------------------------------------------------------------
  const photoRatio = Math.min(1, input.photoCount / IDEAL_PHOTOS);
  if (input.photoCount < IDEAL_PHOTOS) {
    hints.push({
      key: 'addPhotos',
      values: { count: IDEAL_PHOTOS - input.photoCount },
      gain: Math.round(WEIGHTS.photos * (1 - photoRatio)),
    });
  }

  // --- Beschreibung --------------------------------------------------------
  const descriptionRatio = Math.min(1, input.descriptionLength / MIN_DESCRIPTION);
  if (descriptionRatio < 1) {
    hints.push({
      key: 'extendDescription',
      gain: Math.round(WEIGHTS.description * (1 - descriptionRatio)),
    });
  }

  // --- Technische Angaben --------------------------------------------------
  const technicalFields = [
    input.hasMileage, input.hasFirstRegistration, input.hasFuel,
    input.hasTransmission, input.hasPower, input.hasBodyType,
    input.hasDriveType, input.hasColor,
  ];
  const technicalFilled = technicalFields.filter(Boolean).length;
  const technicalRatio = technicalFilled / technicalFields.length;
  if (technicalRatio < 1) {
    hints.push({
      key: 'completeTechnical',
      values: { count: technicalFields.length - technicalFilled },
      gain: Math.round(WEIGHTS.technical * (1 - technicalRatio)),
    });
  }

  // --- Ausstattung ---------------------------------------------------------
  const featureRatio = Math.min(1, input.featureCount / IDEAL_FEATURES);
  if (input.featureCount < IDEAL_FEATURES) {
    hints.push({
      key: 'addFeatures',
      gain: Math.round(WEIGHTS.features * (1 - featureRatio)),
    });
  }

  // --- Historie ------------------------------------------------------------
  const historyFields = [input.hasServiceHistory, input.hasAccidentInfo, input.hasVin];
  const historyFilled = historyFields.filter(Boolean).length;
  const historyRatio = historyFilled / historyFields.length;
  if (!input.hasServiceHistory) {
    hints.push({ key: 'addServiceHistory', gain: Math.round(WEIGHTS.history / 3) });
  }
  if (!input.hasVin) {
    hints.push({ key: 'addVin', gain: Math.round(WEIGHTS.history / 3) });
  }

  // --- Zollstatus ----------------------------------------------------------
  if (!input.hasCustomsStatus) {
    hints.push({ key: 'setCustomsStatus', gain: WEIGHTS.customs });
  }

  const score = Math.round(
    WEIGHTS.photos * photoRatio +
      WEIGHTS.description * descriptionRatio +
      WEIGHTS.technical * technicalRatio +
      WEIGHTS.features * featureRatio +
      WEIGHTS.history * historyRatio +
      WEIGHTS.customs * (input.hasCustomsStatus ? 1 : 0) +
      WEIGHTS.verified * (input.sellerVerified ? 1 : 0),
  );

  return {
    score: Math.min(100, Math.max(0, score)),
    // Der groesste Gewinn zuerst, damit der Verkaeufer sieht, was am meisten bringt.
    hints: hints.filter((hint) => hint.gain > 0).sort((a, b) => b.gain - a.gain),
  };
}
