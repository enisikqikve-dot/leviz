import { afterEach, describe, expect, it } from 'vitest';

import { getEmailProvider, readSmtpSettings, resetEmailProvider } from './index';

const VOLLSTAENDIG = {
  SMTP_HOST: 'smtp.hostinger.com',
  SMTP_USER: 'info@levizz.com',
  SMTP_PASSWORD: 'geheim',
};

afterEach(() => {
  for (const name of ['EMAIL_DRIVER', 'SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_PORT']) {
    delete process.env[name];
  }
  resetEmailProvider();
});

describe('readSmtpSettings', () => {
  it('nimmt eine vollstaendige Konfiguration an', () => {
    const result = readSmtpSettings(VOLLSTAENDIG);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.settings.host).toBe('smtp.hostinger.com');
  });

  it('nimmt Port 465 als Vorgabe und verschluesselt von Anfang an', () => {
    const result = readSmtpSettings(VOLLSTAENDIG);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.settings.port).toBe(465);
      expect(result.settings.secure).toBe(true);
    }
  });

  it('schaltet bei Port 587 auf STARTTLS um', () => {
    // Der einzige Unterschied zwischen den beiden ueblichen Ports: bei 465
    // ist die Verbindung ab dem ersten Byte verschluesselt, bei 587 erst
    // nach der Aushandlung.
    const result = readSmtpSettings({ ...VOLLSTAENDIG, SMTP_PORT: '587' });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.settings.port).toBe(587);
      expect(result.settings.secure).toBe(false);
    }
  });

  it('nennt jede fehlende Angabe beim Namen', () => {
    const result = readSmtpSettings({ ...VOLLSTAENDIG, SMTP_PASSWORD: '' });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.missing).toEqual(['SMTP_PASSWORD']);
  });
});

describe('Auswahl des Versandwegs', () => {
  it('nimmt ohne Angabe das Terminal', () => {
    expect(getEmailProvider().name).toBe('console');
  });

  it('waehlt SMTP bei vollstaendiger Konfiguration', () => {
    process.env.EMAIL_DRIVER = 'smtp';
    Object.assign(process.env, VOLLSTAENDIG);
    resetEmailProvider();

    expect(getEmailProvider().name).toBe('smtp');
  });

  it('bricht bei halber SMTP-Konfiguration ab, statt still ins Terminal zu schreiben', () => {
    // Der stille Rueckfall waere der schlimmste Fall: der Betrieb liefe
    // scheinbar normal, aber niemand bekaeme je eine Mail zum Zuruecksetzen
    // seines Passworts -- und im Protokoll stuende nichts davon.
    process.env.EMAIL_DRIVER = 'smtp';
    resetEmailProvider();

    expect(() => getEmailProvider()).toThrow(/SMTP_HOST/);
  });

  it('weist einen unbekannten Versandweg zurueck', () => {
    process.env.EMAIL_DRIVER = 'brieftaube';
    resetEmailProvider();

    expect(() => getEmailProvider()).toThrow(/brieftaube/);
  });
});
