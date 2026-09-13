/**
 * Push-Meldungen aufs Telefon -- die Schnittstelle, hinter der der Anbieter
 * steht.
 *
 * `to` ist das Token, das die App beim Anmelden hinterlegt hat. `data` ist,
 * was die App beim Antippen bekommt: die Zieladresse und die Kennung der
 * Meldung, damit sie sie als gelesen markieren kann.
 */
export type PushMessage = {
  to: string;
  title: string;
  body?: string;
  data?: Record<string, string>;
};

/** Was der Anbieter zu einer einzelnen Nachricht sagt. */
export type PushTicket =
  | { to: string; ok: true; ticketId: string | null }
  | { to: string; ok: false; error: PushError; message: string };

/**
 * Die Fehler, auf die der Versand reagiert. `DeviceNotRegistered` heisst:
 * dieses Token nie wieder benutzen. Alles andere ist voruebergehend oder ein
 * Fehler der Einrichtung -- beides steht im Protokoll.
 */
export type PushError = 'DeviceNotRegistered' | 'InvalidCredentials' | 'MessageTooBig' | 'MessageRateExceeded' | 'unknown';

/** Das Ergebnis einer Quittung, nachgeschlagen mit der Ticketkennung. */
export type PushReceipt = { ticketId: string; ok: true } | { ticketId: string; ok: false; error: PushError; message: string };

export interface PushProvider {
  readonly name: string;
  send(messages: PushMessage[]): Promise<PushTicket[]>;
  receipts(ticketIds: string[]): Promise<PushReceipt[]>;
}
