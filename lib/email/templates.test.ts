import { describe, expect, it } from 'vitest';

import { newSignupEmail } from './templates';

const PRIVAT = {
  name: 'Arben Krasniqi',
  email: 'arben@example.com',
  dealer: null,
  url: 'https://levizz.com/admin/users',
};

const HAENDLER = { ...PRIVAT, dealer: 'Auto Gashi' };

describe('newSignupEmail', () => {
  it('nennt Namen und Adresse im Text', () => {
    // Eine Meldung, die nur "es gibt eine neue Registrierung" sagt, zwingt zum
    // Nachschlagen und wird nach der dritten ungelesen weggewischt.
    const mail = newSignupEmail('de', PRIVAT);

    expect(mail.text).toContain('Arben Krasniqi');
    expect(mail.text).toContain('arben@example.com');
  });

  it('unterscheidet Haendler und Privatkonto schon im Betreff', () => {
    expect(newSignupEmail('de', HAENDLER).subject).toContain('Auto Gashi');
    expect(newSignupEmail('de', HAENDLER).subject).toMatch(/Händler/i);

    expect(newSignupEmail('de', PRIVAT).subject).toContain('Arben Krasniqi');
    expect(newSignupEmail('de', PRIVAT).subject).not.toMatch(/Händler/i);
  });

  it('nennt beim Haendler den Firmennamen im Text', () => {
    expect(newSignupEmail('sq', HAENDLER).text).toContain('Auto Gashi');
    expect(newSignupEmail('sq', PRIVAT).text).toContain('Shitës privat');
  });

  it('fuehrt den Weg zur Verwaltung mit', () => {
    // Ohne Adresse im Text sucht der Verwalter die Stelle selbst.
    for (const locale of ['sq', 'de', 'en'] as const) {
      expect(newSignupEmail(locale, PRIVAT).text).toContain('https://levizz.com/admin/users');
    }
  });

  it('gibt es in allen drei Sprachen', () => {
    for (const locale of ['sq', 'de', 'en'] as const) {
      const mail = newSignupEmail(locale, HAENDLER);
      expect(mail.subject.length).toBeGreaterThan(0);
      expect(mail.text.length).toBeGreaterThan(0);
    }
  });

  it('haelt die drei Sprachen auseinander', () => {
    const betreffe = (['sq', 'de', 'en'] as const).map(
      (locale) => newSignupEmail(locale, HAENDLER).subject,
    );

    expect(new Set(betreffe).size).toBe(3);
  });
});
