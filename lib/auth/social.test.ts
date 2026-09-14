import { describe, expect, it } from 'vitest';

import { configuredSocialProviders, nativeAudience } from './social';

describe('configuredSocialProviders', () => {
  it('zeigt ohne Zugangswerte keinen Anbieter', () => {
    expect(configuredSocialProviders({})).toEqual([]);
  });

  it('nimmt nur Anbieter mit beiden Werten', () => {
    // Nur die Kennung ohne Geheimnis: der Knopf wuerde auf einer Auth.js-
    // Fehlerseite enden.
    expect(
      configuredSocialProviders({
        AUTH_GOOGLE_ID: 'kennung',
        AUTH_APPLE_ID: 'com.levizz.web',
        AUTH_APPLE_SECRET: 'jwt',
      }),
    ).toEqual(['apple']);
  });

  it('wertet leere Zeichenketten wie fehlende Werte', () => {
    // So stehen sie in .env.example -- und so kopiert man sie versehentlich.
    expect(
      configuredSocialProviders({ AUTH_GITHUB_ID: '', AUTH_GITHUB_SECRET: '   ' }),
    ).toEqual([]);
  });

  it('haelt die Anzeigereihenfolge unabhaengig von der Umgebung', () => {
    expect(
      configuredSocialProviders({
        AUTH_GITHUB_ID: 'a',
        AUTH_GITHUB_SECRET: 'b',
        AUTH_GOOGLE_ID: 'c',
        AUTH_GOOGLE_SECRET: 'd',
      }),
    ).toEqual(['google', 'github']);
  });
});

describe('nativeAudience', () => {
  it('nimmt fuer Google die Web-Client-ID der Website', () => {
    expect(nativeAudience('google', { AUTH_GOOGLE_ID: ' 123.apps.googleusercontent.com ' })).toEqual([
      '123.apps.googleusercontent.com',
    ]);
    // Ohne sie ist der Weg zu -- eine leere Liste, kein Platzhalter.
    expect(nativeAudience('google', {})).toEqual([]);
  });

  it('nimmt fuer Apple die Bundle-ID der App, ohne Einrichtung', () => {
    // Apple braucht serverseitig kein Geheimnis: das Token traegt die App-ID,
    // und die ist bekannt.
    expect(nativeAudience('apple', {})).toEqual(['com.levizz.app']);
    expect(nativeAudience('apple', { AUTH_APPLE_APP_ID: 'com.levizz.beta' })).toEqual(['com.levizz.beta']);
  });
});
