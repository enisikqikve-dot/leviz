import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Zahlungsabwicklung hinter einer Schnittstelle.
 *
 * Der Mock-Anbieter fuehrt denselben Ablauf wie ein echter Anbieter aus:
 * Zahlung anlegen, Nutzer auf eine Bezahlseite schicken, Erfuellung erst nach
 * einem signierten Rueckruf. Nur die Bezahlseite liegt in der eigenen
 * Anwendung statt beim Anbieter. Dadurch ist der Ablauf ohne einen einzigen
 * Zugangsschluessel vollstaendig benutzbar — und der Wechsel auf Stripe
 * tauscht nur diese Klasse aus, nicht die Erfuellungslogik.
 */

export type CheckoutRequest = {
  /** Unsere eigene Zahlungskennung. Der Anbieter reicht sie unveraendert zurueck. */
  paymentId: string;
  amountCents: number;
  currency: string;
  description: string;
};

export type CheckoutSession = {
  /** Vom Anbieter vergebene Kennung. */
  providerPaymentId: string;
  /** Adresse der Bezahlseite. Beim Mock-Anbieter eine eigene Seite. */
  url: string;
  provider: string;
};

export type PaymentEvent = {
  paymentId: string;
  providerPaymentId: string;
  status: 'SUCCEEDED' | 'FAILED';
  failureReason?: string;
};

export interface PaymentProvider {
  readonly name: string;
  createCheckout(request: CheckoutRequest): Promise<CheckoutSession>;
  /**
   * Prueft die Signatur und liest das Ereignis. Gibt `null` zurueck, wenn die
   * Signatur nicht passt — die Route antwortet dann mit 400 und aendert nichts.
   */
  parseWebhook(payload: string, signature: string | null): PaymentEvent | null;
}

/**
 * Das Geheimnis fuer die Rueckruf-Signatur. In der Entwicklung reicht ein
 * fester Wert; produktiv kommt er aus der Umgebung.
 */
function webhookSecret(): string {
  return process.env.PAYMENTS_WEBHOOK_SECRET ?? 'leviz-dev-webhook-secret';
}

/** Signiert eine Nutzlast. Oeffentlich, weil die Bezahlseite sie mitsendet. */
export function signWebhookPayload(payload: string): string {
  return createHmac('sha256', webhookSecret()).update(payload).digest('hex');
}

/** Signaturvergleich in konstanter Zeit, damit er nichts ueber das Geheimnis verraet. */
function signatureMatches(payload: string, signature: string): boolean {
  const expected = Buffer.from(signWebhookPayload(payload), 'utf8');
  const received = Buffer.from(signature, 'utf8');

  if (expected.length !== received.length) return false;
  return timingSafeEqual(expected, received);
}

class MockPaymentProvider implements PaymentProvider {
  readonly name = 'mock';

  async createCheckout(request: CheckoutRequest): Promise<CheckoutSession> {
    return {
      providerPaymentId: `mock_${request.paymentId}`,
      // Die Bezahlseite liegt in der Anwendung. Der Pfad wird beim Aufruf in
      // die aktive Sprache uebersetzt.
      url: `/checkout/${request.paymentId}`,
      provider: this.name,
    };
  }

  parseWebhook(payload: string, signature: string | null): PaymentEvent | null {
    if (!signature || !signatureMatches(payload, signature)) return null;

    let parsed: unknown;
    try {
      parsed = JSON.parse(payload);
    } catch {
      return null;
    }

    if (typeof parsed !== 'object' || parsed === null) return null;
    const event = parsed as Record<string, unknown>;

    const paymentId = event.paymentId;
    const status = event.status;

    if (typeof paymentId !== 'string' || paymentId.length === 0) return null;
    if (status !== 'SUCCEEDED' && status !== 'FAILED') return null;

    return {
      paymentId,
      providerPaymentId:
        typeof event.providerPaymentId === 'string'
          ? event.providerPaymentId
          : `mock_${paymentId}`,
      status,
      failureReason:
        typeof event.failureReason === 'string' ? event.failureReason : undefined,
    };
  }
}

/**
 * Platzhalter fuer Stripe. Die Erfuellung haengt bereits an `parseWebhook`;
 * anzubinden sind hier nur der Aufruf der Checkout-Session und die
 * Signaturpruefung nach Stripes Verfahren.
 */
class StripePaymentProvider implements PaymentProvider {
  readonly name = 'stripe';

  async createCheckout(): Promise<CheckoutSession> {
    throw new Error(
      'Stripe ist nicht angebunden. PAYMENTS_DRIVER=mock setzen oder den Anbieter in lib/payments ergaenzen.',
    );
  }

  parseWebhook(): PaymentEvent | null {
    return null;
  }
}

let provider: PaymentProvider | undefined;

export function getPaymentProvider(): PaymentProvider {
  if (provider) return provider;

  switch (process.env.PAYMENTS_DRIVER ?? 'mock') {
    case 'stripe':
      provider = new StripePaymentProvider();
      return provider;
    case 'mock':
    default:
      provider = new MockPaymentProvider();
      return provider;
  }
}

/** Nur fuer Tests: erzwingt beim naechsten Zugriff eine neue Auswahl. */
export function resetPaymentProvider(): void {
  provider = undefined;
}
