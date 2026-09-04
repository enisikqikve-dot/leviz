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

export function getSmsProvider(): SmsProvider {
  if (provider) return provider;

  const driver = process.env.SMS_DRIVER ?? 'console';

  switch (driver) {
    case 'console':
    default:
      provider = new ConsoleSmsProvider();
      return provider;
  }
}

export function sendSms(message: SmsMessage): Promise<SmsResult> {
  return getSmsProvider().send(message);
}
