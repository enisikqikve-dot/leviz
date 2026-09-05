import { beforeEach, describe, expect, it } from 'vitest';

import { getPaymentProvider, resetPaymentProvider, signWebhookPayload } from './index';

beforeEach(() => {
  resetPaymentProvider();
  process.env.PAYMENTS_DRIVER = 'mock';
});

/** Eine gültige Nutzlast samt passender Signatur. */
function signed(body: Record<string, unknown>): { payload: string; signature: string } {
  const payload = JSON.stringify(body);
  return { payload, signature: signWebhookPayload(payload) };
}

describe('Bezahlvorgang starten', () => {
  it('führt auf die eigene Bezahlseite mit der Zahlungskennung', async () => {
    const session = await getPaymentProvider().createCheckout({
      paymentId: 'pay_123',
      amountCents: 999,
      currency: 'EUR',
      description: 'Pako: Premium',
      successUrl: 'https://leviz.example/paneli/faturimi',
      cancelUrl: 'https://leviz.example/cmimet',
      locale: 'sq',
    });

    expect(session.provider).toBe('mock');
    expect(session.url).toBe('/checkout/pay_123');
    expect(session.providerPaymentId).toBe('mock_pay_123');
  });
});

describe('Rückruf des Anbieters', () => {
  it('nimmt eine richtig signierte Nutzlast an', () => {
    const { payload, signature } = signed({ paymentId: 'pay_1', status: 'SUCCEEDED' });

    expect(getPaymentProvider().parseWebhook(payload, signature)).toEqual({
      paymentId: 'pay_1',
      providerPaymentId: 'mock_pay_1',
      status: 'SUCCEEDED',
      failureReason: undefined,
    });
  });

  it('weist eine falsche Signatur ab', () => {
    const { payload } = signed({ paymentId: 'pay_1', status: 'SUCCEEDED' });

    expect(getPaymentProvider().parseWebhook(payload, 'a'.repeat(64))).toBeNull();
  });

  it('weist eine fehlende Signatur ab', () => {
    const { payload } = signed({ paymentId: 'pay_1', status: 'SUCCEEDED' });

    expect(getPaymentProvider().parseWebhook(payload, null)).toBeNull();
  });

  it('weist eine veränderte Nutzlast ab', () => {
    // Genau der Fall, gegen den signiert wird: der Betrag oder die Kennung
    // wird nachträglich getauscht, die Signatur bleibt die alte.
    const { signature } = signed({ paymentId: 'pay_1', status: 'SUCCEEDED' });
    const tampered = JSON.stringify({ paymentId: 'pay_2', status: 'SUCCEEDED' });

    expect(getPaymentProvider().parseWebhook(tampered, signature)).toBeNull();
  });

  it('weist eine unlesbare Nutzlast ab', () => {
    const payload = 'kein json';

    expect(getPaymentProvider().parseWebhook(payload, signWebhookPayload(payload))).toBeNull();
  });

  it('weist einen unbekannten Zustand ab', () => {
    const { payload, signature } = signed({ paymentId: 'pay_1', status: 'WHATEVER' });

    expect(getPaymentProvider().parseWebhook(payload, signature)).toBeNull();
  });

  it('weist eine fehlende Zahlungskennung ab', () => {
    const { payload, signature } = signed({ status: 'SUCCEEDED' });

    expect(getPaymentProvider().parseWebhook(payload, signature)).toBeNull();
  });

  it('liest den Grund eines Fehlschlags mit', () => {
    const { payload, signature } = signed({
      paymentId: 'pay_9',
      status: 'FAILED',
      failureReason: 'Pagesa u anulua',
    });

    expect(getPaymentProvider().parseWebhook(payload, signature)?.failureReason).toBe(
      'Pagesa u anulua',
    );
  });
});

describe('Anbieterauswahl', () => {
  it('nimmt ohne Angabe den Mock-Anbieter', () => {
    delete process.env.PAYMENTS_DRIVER;
    resetPaymentProvider();

    expect(getPaymentProvider().name).toBe('mock');
  });

  it('meldet Stripe als nicht angebunden statt still zu scheitern', async () => {
    process.env.PAYMENTS_DRIVER = 'stripe';
    resetPaymentProvider();

    const provider = getPaymentProvider();
    expect(provider.name).toBe('stripe');
    await expect(
      provider.createCheckout({
        paymentId: 'p',
        amountCents: 1,
        currency: 'EUR',
        description: '',
        successUrl: 'https://leviz.example/paneli/faturimi',
        cancelUrl: 'https://leviz.example/cmimet',
        locale: 'sq',
      }),
    ).rejects.toThrow(/nicht angebunden/);
  });
});
