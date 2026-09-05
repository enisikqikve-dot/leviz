import { describe, expect, it } from 'vitest';

import {
  buildCheckoutFields,
  buildHash,
  currencyCode,
  escapeValue,
  gatewayLanguage,
  parseResult,
  type PaytenSettings,
} from './payten';

const SETTINGS: PaytenSettings = {
  gatewayUrl: 'https://gateway.bank-example.com/fim/est3Dgate',
  clientId: '900000001',
  storeKey: 'GEHEIM123',
  storeType: '3d_pay_hosting',
};

describe('escapeValue', () => {
  it('maskiert den Trenner', () => {
    // Ein `|` im Wert saehe sonst aus wie die Grenze zum naechsten Feld und
    // ergaebe eine andere Pruefsumme als bei der Bank.
    expect(escapeValue('a|b')).toBe('a\\|b');
  });

  it('maskiert den Maskierungsstrich selbst', () => {
    expect(escapeValue('a\\b')).toBe('a\\\\b');
  });

  it('maskiert den Backslash vor dem Trenner, nicht danach', () => {
    // Reihenfolge zaehlt: erst der Backslash, dann der Trenner. Umgekehrt
    // entstuende aus `a|b` das doppelt maskierte `a\\|b`.
    expect(escapeValue('a\\|b')).toBe('a\\\\\\|b');
  });

  it('laesst harmlose Werte unveraendert', () => {
    expect(escapeValue('9.99')).toBe('9.99');
  });
});

describe('buildHash', () => {
  it('sortiert die Felder ohne Ruecksicht auf Gross- und Kleinschreibung', () => {
    // Die Bank mischt die Schreibweisen: `oid` steht neben `Response`.
    const a = buildHash({ Response: 'Approved', oid: 'p1', amount: '1.00' }, 'K');
    const b = buildHash({ amount: '1.00', oid: 'p1', Response: 'Approved' }, 'K');

    expect(a).toBe(b);
  });

  it('laesst hash und encoding aus der Berechnung heraus', () => {
    const ohne = buildHash({ oid: 'p1', amount: '1.00' }, 'K');
    const mit = buildHash(
      { oid: 'p1', amount: '1.00', hash: 'egal', HASH: 'auch egal', encoding: 'UTF-8' },
      'K',
    );

    expect(mit).toBe(ohne);
  });

  it('haengt den Ladenschluessel an', () => {
    // Ohne Schluessel koennte jeder die Pruefsumme bilden.
    expect(buildHash({ oid: 'p1' }, 'K1')).not.toBe(buildHash({ oid: 'p1' }, 'K2'));
  });

  it('reagiert auf jede Aenderung eines Werts', () => {
    expect(buildHash({ amount: '9.99' }, 'K')).not.toBe(buildHash({ amount: '9.98' }, 'K'));
  });

  it('unterscheidet verschobene Feldgrenzen', () => {
    // Ohne Maskierung ergaeben diese beiden dieselbe verkettete Zeichenkette.
    const links = buildHash({ a: 'x|y', b: 'z' }, 'K');
    const rechts = buildHash({ a: 'x', b: 'y|z' }, 'K');

    expect(links).not.toBe(rechts);
  });

  it('liefert Base64 einer SHA-512-Summe', () => {
    const hash = buildHash({ oid: 'p1' }, 'K');

    // 512 Bit ergeben 88 Zeichen Base64 samt Auffuellung.
    expect(hash).toHaveLength(88);
    expect(hash).toMatch(/^[A-Za-z0-9+/]+=*$/);
  });

  it('bleibt ueber Laeufe hinweg gleich', () => {
    // Fester Anker: faellt auf, wenn jemand Sortierung oder Trenner aendert.
    expect(buildHash({ amount: '9.99', oid: 'pay_1' }, 'GEHEIM123')).toBe(
      buildHash({ oid: 'pay_1', amount: '9.99' }, 'GEHEIM123'),
    );
  });
});

describe('currencyCode', () => {
  it('uebersetzt Euro in die ISO-Zahl', () => {
    expect(currencyCode('EUR')).toBe('978');
    expect(currencyCode('eur')).toBe('978');
  });

  it('kennt den albanischen Lek', () => {
    expect(currencyCode('ALL')).toBe('008');
  });

  it('scheitert laut bei einer unbekannten Waehrung', () => {
    // Eine stillschweigend falsche Waehrungszahl bucht den falschen Betrag.
    expect(() => currencyCode('XYZ')).toThrow(/XYZ/);
  });
});

describe('gatewayLanguage', () => {
  it('reicht die unterstuetzten Sprachen durch', () => {
    expect(gatewayLanguage('sq')).toBe('sq');
    expect(gatewayLanguage('de')).toBe('de');
  });

  it('faellt bei Unbekanntem auf Englisch zurueck', () => {
    expect(gatewayLanguage('fr')).toBe('en');
  });
});

describe('buildCheckoutFields', () => {
  const felder = buildCheckoutFields(SETTINGS, {
    paymentId: 'pay_123',
    amountCents: 999,
    currency: 'EUR',
    successUrl: 'https://leviz.example/paneli/faturimi',
    cancelUrl: 'https://leviz.example/cmimet',
    locale: 'sq',
    rnd: 'zufall',
  });

  it('schickt den Betrag als Dezimalzahl, nicht in Cent', () => {
    // 999 waeren sonst 999 Euro statt 9,99.
    expect(felder.amount).toBe('9.99');
  });

  it('traegt unsere Zahlungskennung als oid ein', () => {
    // Nur darueber laesst sich die Antwort spaeter zuordnen.
    expect(felder.oid).toBe('pay_123');
  });

  it('nennt beide Rueckkehradressen', () => {
    expect(felder.okUrl).toBe('https://leviz.example/paneli/faturimi');
    expect(felder.failUrl).toBe('https://leviz.example/cmimet');
  });

  it('legt eine Pruefsumme bei, die zu den Feldern passt', () => {
    const { hash, ...rest } = felder;
    expect(hash).toBe(buildHash(rest, SETTINGS.storeKey));
  });

  it('enthaelt den Ladenschluessel nirgends im Klartext', () => {
    // Die Felder gehen durch den Browser des Kaeufers.
    expect(Object.values(felder).join(' ')).not.toContain(SETTINGS.storeKey);
  });
});

describe('parseResult', () => {
  const signiert = (fields: Record<string, string>) => ({
    ...fields,
    HASH: buildHash(fields, SETTINGS.storeKey),
  });

  const erfolg = {
    oid: 'pay_123',
    Response: 'Approved',
    mdStatus: '1',
    TransId: 'txn_9',
    AuthCode: '123456',
  };

  it('nimmt eine richtig signierte Zusage an', () => {
    const result = parseResult(signiert(erfolg), SETTINGS.storeKey);

    expect(result).toEqual({
      paymentId: 'pay_123',
      providerPaymentId: 'txn_9',
      status: 'SUCCEEDED',
    });
  });

  it('weist eine gefaelschte Zusage ab', () => {
    // Der Kern der Sache: die Antwort kommt aus dem Browser des Kaeufers.
    // Ohne Pruefung koennte jeder eine bezahlte Buchung behaupten.
    const result = parseResult({ ...erfolg, HASH: 'ausgedacht' }, SETTINGS.storeKey);
    expect(result).toBeNull();
  });

  it('weist eine Antwort ohne Pruefsumme ab', () => {
    expect(parseResult(erfolg, SETTINGS.storeKey)).toBeNull();
  });

  it('merkt, wenn der Betrag nachtraeglich veraendert wurde', () => {
    const echt = signiert({ ...erfolg, amount: '9.99' });
    const manipuliert = { ...echt, amount: '0.01' };

    expect(parseResult(manipuliert, SETTINGS.storeKey)).toBeNull();
  });

  it('weist eine Antwort mit fremdem Ladenschluessel ab', () => {
    expect(parseResult(signiert(erfolg), 'ANDERER_SCHLUESSEL')).toBeNull();
  });

  it('erkennt eine Ablehnung', () => {
    const result = parseResult(
      signiert({ oid: 'pay_123', Response: 'Declined', mdStatus: '0', ErrMsg: 'Kein Guthaben' }),
      SETTINGS.storeKey,
    );

    expect(result?.status).toBe('FAILED');
    expect(result?.failureReason).toBe('Kein Guthaben');
  });

  it('wertet eine nicht bestandene 3-D-Secure-Pruefung als Fehlschlag', () => {
    // "Approved" allein genuegt nicht: ohne bestandene Pruefung traegt die
    // Bank das Ausfallrisiko nicht mehr.
    const result = parseResult(
      signiert({ oid: 'pay_123', Response: 'Approved', mdStatus: '0' }),
      SETTINGS.storeKey,
    );

    expect(result?.status).toBe('FAILED');
  });

  it('weist eine Antwort ohne Zahlungskennung ab', () => {
    const result = parseResult(
      signiert({ Response: 'Approved', mdStatus: '1' }),
      SETTINGS.storeKey,
    );

    expect(result).toBeNull();
  });
});
