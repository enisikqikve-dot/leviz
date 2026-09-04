import { NextResponse } from 'next/server';

import { applyPaymentEvent } from '@/features/packages/fulfilment';
import { getPaymentProvider } from '@/lib/payments';

/**
 * Rueckruf des Zahlungsanbieters.
 *
 * Die einzige Stelle, an der eine Zahlung als bezahlt gilt. Die Nutzlast wird
 * roh gelesen, weil die Signatur ueber genau diese Bytes gebildet wird — ein
 * erneutes Serialisieren wuerde sie brechen.
 */
export async function POST(request: Request) {
  const payload = await request.text();

  // Stripe nutzt `stripe-signature`; der eigene Anbieter sendet den Kopf unten.
  const signature =
    request.headers.get('x-leviz-signature') ?? request.headers.get('stripe-signature');

  const event = getPaymentProvider().parseWebhook(payload, signature);
  if (!event) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
  }

  const result = await applyPaymentEvent(event);

  // Auch eine unbekannte oder bereits abgeschlossene Zahlung wird mit 200
  // beantwortet: sonst versucht der Anbieter es endlos erneut.
  return NextResponse.json(result satisfies object, { status: 200 });
}
