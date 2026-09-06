export type SmsMessage = {
  to: string;
  text: string;
};

export type SmsResult = {
  id: string;
  provider: string;
};

export interface SmsProvider {
  readonly name: string;
  send(message: SmsMessage): Promise<SmsResult>;
}

/**
 * Schreibt den Einmalcode ins Terminal. Die Anmeldung per Telefonnummer laesst
 * sich damit vollstaendig testen, ohne einen kostenpflichtigen Anbieter wie
 * Twilio anzubinden.
 */
class ConsoleSmsProvider implements SmsProvider {
  readonly name = 'console';

  async send(message: SmsMessage): Promise<SmsResult> {
    console.info(
      [
        '',
        '  ┌─ LEVIZ SMS ' + '─'.repeat(55),
        `  │ An:  ${message.to}`,
        `  │ Text: ${message.text}`,
        '  └' + '─'.repeat(67),
        '',
      ].join('\n'),
    );

    return { id: `console_${Date.now().toString(36)}`, provider: this.name };
  }
}

let provider: SmsProvider | undefined;

/**
 * Ob Codes tatsaechlich verschickt werden koennen.
 *
 * Die Anmeldung per Telefonnummer wird ohne einen echten Anbieter gar nicht
 * erst angeboten. Ein Reiter, der zu einem Code fuehrt, den niemand bekommt,
 * ist keine Anmeldemoeglichkeit, sondern eine Sackgasse -- und der Kunde
 * sucht den Fehler bei sich.
 */
export function smsConfigured(): boolean {
  const driver = process.env.SMS_DRIVER ?? 'console';
  return driver !== 'console';
}

export function getSmsProvider(): SmsProvider {
  if (provider) return provider;

  const driver = process.env.SMS_DRIVER ?? 'console';

  if (driver === 'console') {
    provider = new ConsoleSmsProvider();
    return provider;
  }

  // Nicht still auf das Terminal zurueckfallen: sonst liefe der Betrieb
  // scheinbar normal, und die Codes stuenden nur im Protokoll. Wie beim
  // Mailversand gilt: lieber laut scheitern als leise ins Leere schicken.
  throw new Error(
    `SMS_DRIVER="${driver}" ist nicht angebunden. Moeglich ist derzeit nur "console"; ` +
      'ein echter Anbieter gehoert in lib/sms.',
  );
}

export function sendSms(message: SmsMessage): Promise<SmsResult> {
  return getSmsProvider().send(message);
}
