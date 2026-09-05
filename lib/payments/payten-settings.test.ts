import { afterEach, describe, expect, it } from 'vitest';

import { getPaymentProvider, readPaytenSettings, resetPaymentProvider } from './index';

const VOLLSTAENDIG = {
  PAYTEN_GATEWAY_URL: 'https://gateway.bank-example.com/fim/est3Dgate',
  PAYTEN_CLIENT_ID: '900000001',
  PAYTEN_STORE_KEY: 'GEHEIM123',
};

afterEach(() => {
  delete process.env.PAYMENTS_DRIVER;
  for (const name of Object.keys(VOLLSTAENDIG)) delete process.env[name];
  delete process.env.PAYTEN_STORE_TYPE;
  resetPaymentProvider();
});

describe('readPaytenSettings', () => {
  it('nimmt eine vollstaendige Konfiguration an', () => {
    const result = readPaytenSettings(VOLLSTAENDIG);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.settings.clientId).toBe('900000001');
  });

  it('setzt den haeufigsten Ladentyp als Vorgabe', () => {
    const result = readPaytenSettings(VOLLSTAENDIG);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.settings.storeType).toBe('3d_pay_hosting');
  });

  it('uebernimmt einen abweichenden Ladentyp', () => {
    // Nicht jede Bank benutzt denselben; sie nennt den gueltigen Wert.
    const result = readPaytenSettings({ ...VOLLSTAENDIG, PAYTEN_STORE_TYPE: 'pay_hosting' });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.settings.storeType).toBe('pay_hosting');
  });

  it('nennt jede fehlende Angabe beim Namen', () => {
    const result = readPaytenSettings({ ...VOLLSTAENDIG, PAYTEN_STORE_KEY: '' });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.missing).toEqual(['PAYTEN_STORE_KEY']);
  });
});

describe('Anbieterauswahl mit Payten', () => {
  it('waehlt Payten bei vollstaendiger Konfiguration', () => {
    process.env.PAYMENTS_DRIVER = 'payten';
    Object.assign(process.env, VOLLSTAENDIG);
    resetPaymentProvider();

    expect(getPaymentProvider().name).toBe('payten');
  });

  it('bricht ab, statt still auf den Mock zurueckzufallen', () => {
    // Ein stiller Rueckfall liesse Scheinzahlungen durchlaufen: Pakete waeren
    // freigeschaltet, ohne dass Geld geflossen ist.
    process.env.PAYMENTS_DRIVER = 'payten';
    resetPaymentProvider();

    expect(() => getPaymentProvider()).toThrow(/PAYTEN_GATEWAY_URL/);
  });

  it('schickt den Kaeufer per Formular zur Bank', async () => {
    process.env.PAYMENTS_DRIVER = 'payten';
    Object.assign(process.env, VOLLSTAENDIG);
    resetPaymentProvider();

    const session = await getPaymentProvider().createCheckout({
      paymentId: 'pay_123',
      amountCents: 999,
      currency: 'EUR',
      description: 'Premium',
      successUrl: 'https://leviz.example/paneli/faturimi',
      cancelUrl: 'https://leviz.example/cmimet',
      locale: 'sq',
    });

    expect(session.method).toBe('POST');
    expect(session.url).toBe(VOLLSTAENDIG.PAYTEN_GATEWAY_URL);
    expect(session.fields?.oid).toBe('pay_123');
    expect(session.fields?.amount).toBe('9.99');
    expect(session.fields?.hash).toBeTruthy();
  });

  it('fuehrt beide Rueckkehradressen ueber die eigene Route', async () => {
    // Die Antwort der Bank muss geprueft werden, bevor der Kaeufer irgendwo
    // landet — deshalb zeigt auch okUrl auf uns, nicht direkt auf die
    // Zielseite.
    process.env.PAYMENTS_DRIVER = 'payten';
    Object.assign(process.env, VOLLSTAENDIG);
    resetPaymentProvider();

    const session = await getPaymentProvider().createCheckout({
      paymentId: 'pay_123',
      amountCents: 999,
      currency: 'EUR',
      description: 'Premium',
      successUrl: 'https://leviz.example/paneli/faturimi',
      cancelUrl: 'https://leviz.example/cmimet',
      locale: 'sq',
    });

    expect(session.fields?.okUrl).toContain('/api/payments/payten/return');
    expect(session.fields?.failUrl).toContain('/api/payments/payten/return');
  });

  it('vergibt bei jedem Aufruf einen neuen Zufallswert', async () => {
    process.env.PAYMENTS_DRIVER = 'payten';
    Object.assign(process.env, VOLLSTAENDIG);
    resetPaymentProvider();

    const eingabe = {
      paymentId: 'pay_123',
      amountCents: 999,
      currency: 'EUR',
      description: 'Premium',
      successUrl: 'https://leviz.example/a',
      cancelUrl: 'https://leviz.example/b',
      locale: 'sq',
    };

    const erste = await getPaymentProvider().createCheckout(eingabe);
    const zweite = await getPaymentProvider().createCheckout(eingabe);

    expect(erste.fields?.rnd).not.toBe(zweite.fields?.rnd);
  });
});
