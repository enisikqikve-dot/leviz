import { NextResponse } from 'next/server';

import { applyPaymentEvent } from '@/features/packages/fulfilment';
import { readPaytenSettings } from '@/lib/payments';
import { parseResult } from '@/lib/payments/payten';
import { siteConfig } from '@/lib/site';

/**
 * Rueckkehr von der Bezahlseite der Bank.
 *
 * Anders als bei einem gewoehnlichen Rueckruf schickt hier nicht der Server der
 * Bank die Antwort, sondern der Browser des Kaeufers: die Bezahlseite laesst
 * sein Formular auf diese Adresse abschicken. Der Absender ist damit voellig
 * unvertrauenswuerdig — jeder koennte dieselbe Anfrage von Hand stellen und
 * eine bezahlte Buchung behaupten.
 *
 * Die Pruefsumme ueber alle Felder ist die einzige Absicherung. Sie wird mit
 * dem Ladenschluessel gebildet, den nur die Bank und wir kennen. Stimmt sie
 * nicht, wird nichts gebucht.
 */
export async function POST(request: Request) {
  const settings = readPaytenSettings(process.env);

  if (!settings.ok) {
    return NextResponse.json(
      { error: `Payten ist nicht eingerichtet: ${settings.missing.join(', ')}` },
      { status: 500 },
    );
  }

  const form = await request.formData();
  const fields: Record<string, string> = {};
  for (const [name, value] of form.entries()) {
    if (typeof value === 'string') fields[name] = value;
  }

  const result = parseResult(fields, settings.settings.storeKey);

  if (!result) {
    // Keine Auskunft darueber, was genau nicht stimmte: das hilft nur beim
    // Herumprobieren an der Pruefsumme.
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
  }

  // Idempotent: die Bank stellt dieselbe Antwort mitunter mehrfach zu, und der
  // Kaeufer kann die Seite neu laden.
  await applyPaymentEvent(result);

  return NextResponse.redirect(safeNext(request, result.status), {
    // 303 zwingt den Browser auf GET. Ohne das wiederholte er den POST bei
    // jedem Aktualisieren.
    status: 303,
  });
}

/**
 * Wohin es nach der Zahlung weitergeht.
 *
 * Die Zieladresse steht im Parameter `next`, den wir selbst gesetzt haben —
 * aber sie kommt durch den Browser des Kaeufers zurueck und ist damit
 * veraenderbar. Fremde Adressen werden verworfen, sonst waere das eine offene
 * Weiterleitung, mit der sich Besucher von LEVIZ aus auf eine
 * nachgemachte Bankseite schicken liessen.
 */
function safeNext(request: Request, status: 'SUCCEEDED' | 'FAILED'): URL {
  const site = new URL(siteConfig.url);
  const fallback = new URL(status === 'SUCCEEDED' ? '/dashboard/billing' : '/pricing', site);

  const requested = new URL(request.url).searchParams.get('next');
  if (!requested) return fallback;

  try {
    const target = new URL(requested, site);
    return target.origin === site.origin ? target : fallback;
  } catch {
    return fallback;
  }
}
