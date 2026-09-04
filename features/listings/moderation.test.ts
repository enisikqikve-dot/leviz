import { describe, expect, it } from 'vitest';

import { assessListing, type ReviewInput } from './moderation';

const base: ReviewInput = {
  priceCents: 850_000,
  photoCount: 8,
  description: 'Vetura është në gjendje shumë të mirë, e doganuar dhe me libër servisi të plotë.',
  accountAgeHours: 720,
  priceFloorCents: 50_000,
  sellerVerified: false,
};

describe('Automatische Verdachtspruefung', () => {
  it('laesst ein unauffaelliges Inserat sofort durch', () => {
    expect(assessListing(base)).toEqual({ needsReview: false, signals: [] });
  });

  it('faengt einen unrealistisch niedrigen Preis ab', () => {
    const result = assessListing({ ...base, priceCents: 20_000 });
    expect(result.needsReview).toBe(true);
    expect(result.signals).toContain('priceTooLow');
  });

  it('faengt ein Inserat fast ohne Fotos ab', () => {
    expect(assessListing({ ...base, photoCount: 1 }).signals).toContain('tooFewPhotos');
  });

  it('erkennt eine Telefonnummer im Beschreibungstext', () => {
    const result = assessListing({
      ...base,
      description: 'Vetura shitet urgjent, telefononi 044 123 456 për detaje.',
    });
    expect(result.signals).toContain('contactInDescription');
  });

  it('erkennt eine E-Mail-Adresse im Beschreibungstext', () => {
    const result = assessListing({ ...base, description: 'Shkruani ne shitesi@example.com' });
    expect(result.signals).toContain('contactInDescription');
  });

  it('erkennt typische Betrugsformulierungen', () => {
    const result = assessListing({
      ...base,
      description: 'Pagesa behet me Western Union para dorezimit te vetures ne adresen tuaj.',
    });
    expect(result.signals).toContain('suspiciousWording');
  });

  it('sieht sich das erste Inserat eines frischen Kontos an', () => {
    const result = assessListing({ ...base, accountAgeHours: 2 });
    expect(result.needsReview).toBe(true);
    expect(result.signals).toContain('newAccount');
  });

  it('nimmt geprüfte Haendler von der Pruefung aus', () => {
    const result = assessListing({ ...base, accountAgeHours: 2, photoCount: 1, sellerVerified: true });
    expect(result.needsReview).toBe(false);
    // Die Auffaelligkeiten werden trotzdem festgehalten.
    expect(result.signals.length).toBeGreaterThan(0);
  });

  it('haelt normale Jahreszahlen nicht fuer Telefonnummern', () => {
    const result = assessListing({
      ...base,
      description: 'Prodhim 2016, 185000 km, servisi i fundit ne 2025. Gjendje shume e mire.',
    });
    expect(result.signals).not.toContain('contactInDescription');
  });
});
