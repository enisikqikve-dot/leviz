import { ConsoleEmailProvider } from './console-provider';
import type { EmailMessage, EmailProvider, EmailResult } from './types';

export type { EmailMessage, EmailProvider, EmailResult } from './types';

let provider: EmailProvider | undefined;

/**
 * Waehlt den Versandweg anhand von EMAIL_DRIVER. Ohne Konfiguration laeuft der
 * Terminal-Anbieter, damit die Anwendung ohne Zugangsschluessel benutzbar ist.
 * Resend und SMTP werden hier eingehaengt, sobald sie gebraucht werden.
 */
export function getEmailProvider(): EmailProvider {
  if (provider) return provider;

  const driver = process.env.EMAIL_DRIVER ?? 'console';

  switch (driver) {
    case 'console':
    default:
      provider = new ConsoleEmailProvider();
      return provider;
  }
}

export function sendEmail(message: EmailMessage): Promise<EmailResult> {
  return getEmailProvider().send(message);
}

export const EMAIL_FROM = process.env.EMAIL_FROM ?? 'LEVIZ <no-reply@leviz.example>';
