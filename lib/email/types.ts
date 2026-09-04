export type EmailAddress = string;

export type EmailMessage = {
  to: EmailAddress | EmailAddress[];
  subject: string;
  /** Reiner Text ist Pflicht, HTML optional — so bleibt jede Mail lesbar. */
  text: string;
  html?: string;
  replyTo?: EmailAddress;
};

export type EmailResult = {
  id: string;
  provider: string;
};

export interface EmailProvider {
  readonly name: string;
  send(message: EmailMessage): Promise<EmailResult>;
}
