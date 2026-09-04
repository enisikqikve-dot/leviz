import type { EmailMessage, EmailProvider, EmailResult } from './types';

/**
 * Schreibt Nachrichten ins Terminal statt sie zu versenden. Damit lassen sich
 * Registrierung und Passwort-Zuruecksetzung ohne jeden Zugangsschluessel
 * vollstaendig durchspielen.
 */
export class ConsoleEmailProvider implements EmailProvider {
  readonly name = 'console';

  async send(message: EmailMessage): Promise<EmailResult> {
    const id = `console_${Date.now().toString(36)}`;
    const recipients = Array.isArray(message.to) ? message.to.join(', ') : message.to;

    console.info(
      [
        '',
        '  ┌─ LEVIZ E-Mail ' + '─'.repeat(52),
        `  │ An:      ${recipients}`,
        `  │ Betreff: ${message.subject}`,
        '  ├' + '─'.repeat(67),
        ...message.text.trim().split('\n').map((line) => `  │ ${line}`),
        '  └' + '─'.repeat(67),
        '',
      ].join('\n'),
    );

    return { id, provider: this.name };
  }
}
