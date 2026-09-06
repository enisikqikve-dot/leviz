import { describe, expect, it } from 'vitest';

import { MAX_DOCUMENT_BYTES, validateDocument } from './document';

const mitVorspann = (...bytes: number[]) => {
  const daten = new Uint8Array(64);
  daten.set(bytes);
  return daten;
};

const ausText = (text: string) => {
  const daten = new Uint8Array(64);
  daten.set([...text].map((zeichen) => zeichen.charCodeAt(0)));
  return daten;
};

describe('validateDocument', () => {
  it('nimmt ein PDF an', () => {
    const ergebnis = validateDocument(ausText('%PDF-1.7'));

    expect(ergebnis).toEqual({ ok: true, format: 'pdf', mime: 'application/pdf' });
  });

  it('nimmt dieselben Bildformate an wie ein Fahrzeugfoto', () => {
    expect(validateDocument(mitVorspann(0xff, 0xd8, 0xff))).toMatchObject({
      ok: true,
      format: 'jpeg',
    });
    expect(
      validateDocument(mitVorspann(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)),
    ).toMatchObject({ ok: true, format: 'png' });
  });

  it('weist HEIC vom iPhone mit eigener Meldung ab', () => {
    const daten = ausText('....ftypheic');

    expect(validateDocument(daten)).toEqual({ ok: false, error: 'heicNotSupported' });
  });

  it('weist alles ab, was kein Bild und kein PDF ist', () => {
    // Eine als Ausweis benannte HTML-Datei. Der Verwalter oeffnet den Beleg
    // spaeter im Browser -- sie duerfte dort nie ankommen.
    expect(validateDocument(ausText('<!doctype html>'))).toEqual({
      ok: false,
      error: 'unsupportedFormat',
    });

    // Fast ein PDF, aber eben nicht.
    expect(validateDocument(ausText('%PDX-1.7'))).toEqual({
      ok: false,
      error: 'unsupportedFormat',
    });
  });

  it('weist Leeres und Uebergrosses ab', () => {
    expect(validateDocument(new Uint8Array(0))).toEqual({ ok: false, error: 'empty' });

    const zuGross = new Uint8Array(MAX_DOCUMENT_BYTES + 1);
    zuGross.set([0xff, 0xd8, 0xff]);
    expect(validateDocument(zuGross)).toEqual({ ok: false, error: 'tooLarge' });
  });
});
