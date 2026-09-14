import { describe, expect, it } from 'vitest';

import { configuredSocialProviders } from './social';

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
