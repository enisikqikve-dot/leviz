import type { PushError, PushMessage, PushProvider, PushReceipt, PushTicket } from './types';

/**
 * Der Push-Dienst von Expo.
 *
 * Die App holt sich ein ExponentPushToken; dieser Dienst reicht die Nachricht
 * an FCM (Android) oder APNs (iOS) weiter. Fuer den Server heisst das: eine
 * HTTPS-Schnittstelle statt zwei, und keine Firebase-Bibliothek im Abbild.
 * Die Zugangsdaten zu FCM und APNs liegen bei Expo (EAS credentials), nicht
 * hier -- der Server kennt hoechstens ein Zugriffs-Token fuer Expo selbst.
 *
 * Hoechstens 100 Nachrichten je Anfrage; mehr werden gestueckelt.
 */
const SEND_URL = 'https://exp.host/--/api/v2/push/send';
const RECEIPT_URL = 'https://exp.host/--/api/v2/push/getReceipts';
const CHUNK = 100;

type TicketAntwort = {
  data?: ({ status: 'ok'; id: string } | { status: 'error'; message: string; details?: { error?: string } })[];
  errors?: { code: string; message: string }[];
};

type ReceiptAntwort = {
  data?: Record<string, { status: 'ok' } | { status: 'error'; message: string; details?: { error?: string } }>;
};

const BEKANNT: PushError[] = ['DeviceNotRegistered', 'InvalidCredentials', 'MessageTooBig', 'MessageRateExceeded'];

function fehlerAus(details?: { error?: string }): PushError {
  const code = details?.error;
  return code && (BEKANNT as string[]).includes(code) ? (code as PushError) : 'unknown';
}

export class ExpoPushProvider implements PushProvider {
  readonly name = 'expo';

  constructor(
    private readonly accessToken: string | undefined,
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  private headers(): Record<string, string> {
    return {
      accept: 'application/json',
      'content-type': 'application/json',
      ...(this.accessToken ? { authorization: `Bearer ${this.accessToken}` } : {}),
    };
  }

  async send(messages: PushMessage[]): Promise<PushTicket[]> {
    const tickets: PushTicket[] = [];

    for (let i = 0; i < messages.length; i += CHUNK) {
      const stueck = messages.slice(i, i + CHUNK);
      const antwort = await this.fetchFn(SEND_URL, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify(
          stueck.map((m) => ({
            to: m.to,
            title: m.title,
            body: m.body,
            data: m.data,
            sound: 'default',
            channelId: 'default',
          })),
        ),
      });

      const json = (await antwort.json().catch(() => null)) as TicketAntwort | null;

      // Ein Fehler der ganzen Anfrage (401, 429, kaputter Rumpf) trifft jede
      // Nachricht des Stuecks -- als voruebergehend, nicht als totes Geraet.
      if (!antwort.ok || !json?.data || json.data.length !== stueck.length) {
        const message = json?.errors?.[0]?.message ?? `HTTP ${antwort.status}`;
        const error: PushError = antwort.status === 401 || antwort.status === 403 ? 'InvalidCredentials' : 'unknown';
        for (const m of stueck) tickets.push({ to: m.to, ok: false, error, message });
        continue;
      }

      json.data.forEach((eintrag, index) => {
        const to = stueck[index].to;
        if (eintrag.status === 'ok') tickets.push({ to, ok: true, ticketId: eintrag.id });
        else tickets.push({ to, ok: false, error: fehlerAus(eintrag.details), message: eintrag.message });
      });
    }

    return tickets;
  }

  async receipts(ticketIds: string[]): Promise<PushReceipt[]> {
    const ergebnis: PushReceipt[] = [];

    for (let i = 0; i < ticketIds.length; i += CHUNK) {
      const stueck = ticketIds.slice(i, i + CHUNK);
      const antwort = await this.fetchFn(RECEIPT_URL, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({ ids: stueck }),
      });
      const json = (await antwort.json().catch(() => null)) as ReceiptAntwort | null;
      if (!antwort.ok || !json?.data) continue;

      for (const ticketId of stueck) {
        const eintrag = json.data[ticketId];
        // Noch keine Quittung: beim naechsten Mal wieder fragen.
        if (!eintrag) continue;
        if (eintrag.status === 'ok') ergebnis.push({ ticketId, ok: true });
        else ergebnis.push({ ticketId, ok: false, error: fehlerAus(eintrag.details), message: eintrag.message });
      }
    }

    return ergebnis;
  }
}
