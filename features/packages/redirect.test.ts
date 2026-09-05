import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';

import { buildCheckoutForm } from './redirect';

function dokument(): Document {
  return new JSDOM('<!doctype html><html><body></body></html>').window.document;
}

describe('buildCheckoutForm', () => {
  const ziel = {
    url: 'https://gateway.bank-example.com/pay',
    fields: {
      clientid: '900000001',
      oid: 'pay_123',
      amount: '9.99',
      currency: '978',
      okUrl: 'https://leviz.example/paneli/faturimi',
      failUrl: 'https://leviz.example/cmimet',
      lang: 'sq',
      hash: 'abc123==',
    },
  };

  it('schickt per POST an die Adresse des Anbieters', () => {
    const form = buildCheckoutForm(dokument(), ziel);

    expect(form.method.toUpperCase()).toBe('POST');
    expect(form.action).toBe(ziel.url);
  });

  it('uebernimmt jedes Feld unveraendert als verstecktes Eingabefeld', () => {
    const form = buildCheckoutForm(dokument(), ziel);
    const inputs = [...form.querySelectorAll('input')];

    expect(inputs).toHaveLength(Object.keys(ziel.fields).length);

    for (const [name, value] of Object.entries(ziel.fields)) {
      const input = form.querySelector(`input[name="${name}"]`) as HTMLInputElement | null;
      expect(input, `Feld ${name} fehlt`).not.toBeNull();
      expect(input!.value).toBe(value);
      expect(input!.type).toBe('hidden');
    }
  });

  it('haelt die Pruefsumme aus der Adresszeile heraus', () => {
    // Der Kern der Sache: alles steckt im Rumpf, nicht in der Adresse. Sonst
    // stuende die Pruefsumme im Browserverlauf und in Serverprotokollen.
    const form = buildCheckoutForm(dokument(), ziel);

    expect(form.action).not.toContain('hash');
    expect(form.action).not.toContain('amount');
  });

  it('zeigt das Formular nicht an', () => {
    // Die Seite wird sofort verlassen; sichtbar waere es nur als Aufblitzen.
    expect(buildCheckoutForm(dokument(), ziel).hidden).toBe(true);
  });

  it('verkraftet Werte mit Sonderzeichen', () => {
    const form = buildCheckoutForm(dokument(), {
      url: 'https://gateway.example/pay',
      fields: { description: 'Pako "Premium" & mehr <>', hash: 'a+b/c==' },
    });

    const beschreibung = form.querySelector('input[name="description"]') as HTMLInputElement;
    expect(beschreibung.value).toBe('Pako "Premium" & mehr <>');

    const hash = form.querySelector('input[name="hash"]') as HTMLInputElement;
    expect(hash.value).toBe('a+b/c==');
  });
});
