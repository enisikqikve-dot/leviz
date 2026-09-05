import { describe, expect, it } from 'vitest';

import de from '@/messages/de.json';
import en from '@/messages/en.json';
import sq from '@/messages/sq.json';

import { authErrorKey } from './oauth-error';

describe('authErrorKey', () => {
  it('erklaert das haeufigste Missverstaendnis eigens', () => {
    // Wer sich mit Passwort registriert hat und spaeter den GitHub-Knopf
    // drueckt, landet genau hier.
    expect(authErrorKey('OAuthAccountNotLinked')).toBe('errorAccountExists');
  });

  it('erkennt den Abbruch auf der GitHub-Seite', () => {
    expect(authErrorKey('AccessDenied')).toBe('errorAccessDenied');
  });

  it('faengt unbekannte Codes allgemein ab', () => {
    // Auth.js kennt mehr Codes als wir uebersetzen. Keiner davon darf roh
    // auf der Seite landen.
    for (const code of ['Configuration', 'Verification', 'OAuthCallbackError', 'irgendwas']) {
      expect(authErrorKey(code)).toBe('errorGeneric');
    }
  });

  it('meldet ohne Fehlercode nichts', () => {
    // Der Normalfall: die Anmeldeseite wird einfach aufgerufen.
    expect(authErrorKey(undefined)).toBeNull();
    expect(authErrorKey(null)).toBeNull();
    expect(authErrorKey('')).toBeNull();
  });

  it('jeder Schluessel ist in allen drei Sprachen uebersetzt', () => {
    const keys = ['errorAccountExists', 'errorAccessDenied', 'errorGeneric'] as const;

    for (const [name, messages] of [['sq', sq], ['de', de], ['en', en]] as const) {
      for (const key of keys) {
        const text = (messages.auth as Record<string, string>)[key];
        expect(text, `${key} fehlt in ${name}.json`).toBeTruthy();
      }
    }
  });
});
