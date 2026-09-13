import type { PushMessage, PushProvider, PushReceipt, PushTicket } from './types';

/**
 * Schreibt ins Terminal statt aufs Telefon. Fuer die Entwicklung, und als
 * Vorgabe ohne Einrichtung -- im Betrieb steht dann ein Hinweis im Protokoll.
 */
export class ConsolePushProvider implements PushProvider {
  readonly name = 'console';

  async send(messages: PushMessage[]): Promise<PushTicket[]> {
    for (const m of messages) {
      console.info(`  LEVIZ Push -> ${m.to.slice(0, 28)}…  ${m.title}${m.body ? ` -- ${m.body}` : ''}`);
    }
    return messages.map((m) => ({ to: m.to, ok: true, ticketId: null }));
  }

  async receipts(ticketIds: string[]): Promise<PushReceipt[]> {
    return ticketIds.map((ticketId) => ({ ticketId, ok: true }));
  }
}
