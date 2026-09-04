import { describe, expect, it } from 'vitest';

import { calculateQualityScore, type QualityInput } from './quality-score';

const empty: QualityInput = {
  photoCount: 0, descriptionLength: 0, featureCount: 0,
  hasMileage: false, hasFirstRegistration: false, hasFuel: false,
  hasTransmission: false, hasPower: false, hasBodyType: false,
  hasDriveType: false, hasColor: false, hasCustomsStatus: false,
  hasServiceHistory: false, hasAccidentInfo: false, hasVin: false,
  sellerVerified: false,
};

const perfect: QualityInput = {
  photoCount: 12, descriptionLength: 400, featureCount: 15,
  hasMileage: true, hasFirstRegistration: true, hasFuel: true,
  hasTransmission: true, hasPower: true, hasBodyType: true,
  hasDriveType: true, hasColor: true, hasCustomsStatus: true,
  hasServiceHistory: true, hasAccidentInfo: true, hasVin: true,
  sellerVerified: true,
};

describe('Qualitaetsscore', () => {
  it('gibt einem leeren Inserat null Punkte', () => {
    expect(calculateQualityScore(empty).score).toBe(0);
  });

  it('gibt einem vollstaendigen Inserat 100 Punkte', () => {
    expect(calculateQualityScore(perfect).score).toBe(100);
  });

  it('bleibt immer zwischen 0 und 100', () => {
    const overfilled = { ...perfect, photoCount: 99, descriptionLength: 9999, featureCount: 99 };
    expect(calculateQualityScore(overfilled).score).toBe(100);
  });

  it('nennt bei einem leeren Inserat konkrete Schritte', () => {
    const keys = calculateQualityScore(empty).hints.map((hint) => hint.key);
    expect(keys).toContain('addPhotos');
    expect(keys).toContain('extendDescription');
    expect(keys).toContain('completeTechnical');
    expect(keys).toContain('setCustomsStatus');
  });

  it('gibt keine Hinweise, wenn nichts mehr fehlt', () => {
    expect(calculateQualityScore(perfect).hints).toEqual([]);
  });

  it('sortiert die Hinweise nach groesstem Gewinn zuerst', () => {
    const hints = calculateQualityScore(empty).hints;
    const gains = hints.map((hint) => hint.gain);
    expect(gains).toEqual([...gains].sort((a, b) => b - a));
  });

  it('sagt, wie viele Fotos noch fehlen', () => {
    const hint = calculateQualityScore({ ...empty, photoCount: 5 }).hints
      .find((entry) => entry.key === 'addPhotos');
    expect(hint?.values?.count).toBe(3);
  });

  it('belohnt jedes ergaenzte Feld', () => {
    const before = calculateQualityScore({ ...empty, photoCount: 4 }).score;
    const after = calculateQualityScore({ ...empty, photoCount: 8 }).score;
    expect(after).toBeGreaterThan(before);
  });

  it('gewichtet Fotos staerker als die Verifizierung', () => {
    const withPhotos = calculateQualityScore({ ...empty, photoCount: 8 }).score;
    const withVerification = calculateQualityScore({ ...empty, sellerVerified: true }).score;
    expect(withPhotos).toBeGreaterThan(withVerification);
  });
});
