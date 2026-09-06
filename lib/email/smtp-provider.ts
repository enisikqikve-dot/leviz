import { createTransport, type Transporter } from 'nodemailer';

import type { EmailMessage, EmailProvider, EmailResult } from './types';

/**
 * Versand über einen gewöhnlichen Mailserver.
 *
 * Der naheliegende Weg für LEVIZ: das Postfach, das ohnehin zur Domäne
 * gehört. Mail von `info@levizz.com` über den Server, auf den SPF und DKIM
 * dieser Domäne bereits zeigen, landet im Posteingang statt im Spam — ein
 * fremder Versender müsste dafür erst freigeschaltet werden.
 */
export type SmtpSettings = {
  host: string;
  port: number;
  user: string;
  password: string;
  /**
   * Verschlüsselt ab dem ersten Byte (Port 465) oder erst nach STARTTLS
   * (Port 587). Wird aus dem Port abgeleitet, weil das die einzige Stelle
   * ist, an der sich beide Anbieter unterscheiden.
   */
  secure: boolean;
};

export function readSmtpSettings(
  env: Record<string, string | undefined>,
): { ok: true; settings: SmtpSettings } | { ok: false; missing: string[] } {
  const required = {
    SMTP_HOST: env.SMTP_HOST,
    SMTP_USER: env.SMTP_USER,
    SMTP_PASSWORD: env.SMTP_PASSWORD,
  };

  const missing = Object.entries(required)
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) return { ok: false, missing };

  const port = Number(env.SMTP_PORT || 465);

  return {
    ok: true,
    settings: {
      host: required.SMTP_HOST!,
      port,
      user: required.SMTP_USER!,
      password: required.SMTP_PASSWORD!,
      secure: port === 465,
    },
  };
}

export class SmtpEmailProvider implements EmailProvider {
  readonly name = 'smtp';

  private readonly transport: Transporter;

  constructor(settings: SmtpSettings) {
    this.transport = createTransport({
      host: settings.host,
      port: settings.port,
      secure: settings.secure,
      auth: { user: settings.user, pass: settings.password },
    });
  }

  async send(message: EmailMessage): Promise<EmailResult> {
    const info = await this.transport.sendMail({
      from: process.env.EMAIL_FROM,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
      replyTo: message.replyTo,
    });

    return { id: info.messageId, provider: this.name };
  }
}
