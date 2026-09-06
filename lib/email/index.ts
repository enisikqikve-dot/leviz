import { ConsoleEmailProvider } from './console-provider';
import { readSmtpSettings, SmtpEmailProvider } from './smtp-provider';
import type { EmailMessage, EmailProvider, EmailResult } from './types';

export type { EmailMessage, EmailProvider, EmailResult } from './types';
export { readSmtpSettings } from './smtp-provider';

let provider: EmailProvider | undefined;

/**
 * Waehlt den Versandweg anhand von EMAIL_DRIVER. Ohne Konfiguration laeuft der
 * Terminal-Anbieter, damit die Anwendung ohne Zugangsschluessel benutzbar ist.
 *
 * Ein unbekannter oder halb eingerichteter Wert faellt *nicht* still auf das
 * Terminal zurueck. Sonst liefe der Betrieb scheinbar normal, und niemand
 * bekaeme je eine Mail: kein Willkommensgruss, und vor allem keine
 * Zuruecksetzung des Passworts. Ausgesperrte Nutzer haetten dann keinen Weg
 * zurueck, und im Fehlerprotokoll stuende nichts.
 */
export function getEmailProvider(): EmailProvider {
  if (provider) return provider;

  const driver = process.env.EMAIL_DRIVER ?? 'console';

  if (driver === 'console') {
    provider = new ConsoleEmailProvider();
    return provider;
  }

  if (driver === 'smtp') {
    const result = readSmtpSettings(process.env);

    if (!result.ok) {
      throw new Error(
        `EMAIL_DRIVER="smtp", aber es fehlen: ${result.missing.join(', ')}`,
      );
    }

    provider = new SmtpEmailProvider(result.settings);
    return provider;
  }

  throw new Error(
    `EMAIL_DRIVER="${driver}" ist unbekannt. Moeglich sind "console" und "smtp".`,
  );
}

/** Nur fuer Tests: erzwingt beim naechsten Zugriff eine neue Auswahl. */
export function resetEmailProvider(): void {
  provider = undefined;
}

export function sendEmail(message: EmailMessage): Promise<EmailResult> {
  return getEmailProvider().send(message);
}

export const EMAIL_FROM = process.env.EMAIL_FROM ?? 'LEVIZ <no-reply@leviz.example>';
