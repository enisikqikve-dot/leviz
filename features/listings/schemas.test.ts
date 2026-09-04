import { describe, expect, it } from 'vitest';

import { VALID_LISTING } from './fixtures';
import { listingSchema, STEPS } from './schemas';

describe('Inserat-Schema', () => {
  it('nimmt eine vollständige Eingabe an', () => {
    const parsed = listingSchema.safeParse(VALID_LISTING);
    expect(parsed.success, JSON.stringify(parsed.error?.issues?.slice(0, 3))).toBe(true);
  });

  it('verlangt mindestens ein Foto', () => {
    expect(listingSchema.safeParse({ ...VALID_LISTING, images: [] }).success).toBe(false);
  });

  it('verlangt eine aussagekräftige Beschreibung', () => {
    expect(listingSchema.safeParse({ ...VALID_LISTING, description: 'Shitet' }).success)
      .toBe(false);
  });

  it('weist ein Baujahr in der Zukunft ab', () => {
    const future = new Date().getFullYear() + 5;
    expect(listingSchema.safeParse({ ...VALID_LISTING, registrationYear: future }).success)
      .toBe(false);
  });

  it('weist einen unglaubwürdigen Kilometerstand ab', () => {
    expect(listingSchema.safeParse({ ...VALID_LISTING, mileageKm: 5_000_000 }).success)
      .toBe(false);
  });

  it('weist einen Preis unter der Untergrenze ab', () => {
    expect(listingSchema.safeParse({ ...VALID_LISTING, priceEur: 5 }).success).toBe(false);
  });

  it('prüft die Länge der Fahrgestellnummer', () => {
    expect(listingSchema.safeParse({ ...VALID_LISTING, vin: 'ZU-KURZ' }).success).toBe(false);
    expect(listingSchema.safeParse({ ...VALID_LISTING, vin: 'WVWZZZ3CZHE123456' }).success)
      .toBe(true);
  });

  it('setzt fehlende Standardwerte selbst', () => {
    // Felder mit Standardwert weglassen, statt sie zu destrukturieren — das
    // erzeugt sonst ungenutzte Bindungen.
    const ohneDefaults: Record<string, unknown> = { ...VALID_LISTING };
    delete ohneDefaults.negotiable;
    delete ohneDefaults.hideExactAddress;

    const parsed = listingSchema.parse(ohneDefaults);
    expect(parsed.negotiable).toBe(false);
    expect(parsed.hideExactAddress).toBe(true);
  });

  it('führt durch neun Schritte, der letzte ist die Kontrolle', () => {
    expect(STEPS).toHaveLength(9);
    expect(STEPS.at(-1)).toBe('preview');
  });
});
