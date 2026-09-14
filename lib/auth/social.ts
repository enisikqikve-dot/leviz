/**
 * Anmeldung ueber fremde Konten: Google, Apple, GitHub.
 *
 * Ein Anbieter erscheint nur, wenn seine beiden Zugangswerte gesetzt sind --
 * ueberall gleich: in der Auth.js-Konfiguration, auf der Anmeldeseite und
 * auf der Registrierseite. Ein Knopf, hinter dem kein eingerichteter Anbieter
 * steht, fuehrt auf eine Fehlerseite von Auth.js, und der Kunde sucht den
 * Fehler bei sich.
 *
 * Bewusst ohne Next-Importe, damit die Liste in Tests ohne Umgebung laeuft.
 */

/** Reihenfolge der Knoepfe: Google zuerst -- Gmail ist im Kosovo die Regel. */
export const SOCIAL_PROVIDERS = ['google', 'apple', 'github'] as const;

export type SocialProvider = (typeof SOCIAL_PROVIDERS)[number];

/**
 * Die Umgebungsvariablen, die Auth.js von selbst liest (`AUTH_<NAME>_ID` und
 * `AUTH_<NAME>_SECRET`). Bei Apple ist das "Secret" ein selbst signiertes
 * JWT, siehe lib/auth/apple-secret.ts.
 */
const ENV_KEYS: Record<SocialProvider, readonly [id: string, secret: string]> = {
  google: ['AUTH_GOOGLE_ID', 'AUTH_GOOGLE_SECRET'],
  apple: ['AUTH_APPLE_ID', 'AUTH_APPLE_SECRET'],
  github: ['AUTH_GITHUB_ID', 'AUTH_GITHUB_SECRET'],
};

/** Welche Anbieter vollstaendig eingerichtet sind, in Anzeigereihenfolge. */
export function configuredSocialProviders(
  env: Record<string, string | undefined> = process.env,
): SocialProvider[] {
  return SOCIAL_PROVIDERS.filter((provider) =>
    ENV_KEYS[provider].every((key) => Boolean(env[key]?.trim())),
  );
}

/**
 * Fuer wen ein ID-Token aus der App ausgestellt sein muss (`aud`).
 *
 * Google: die Web-Client-ID -- dieselbe wie fuer die Website. Die
 * Anmeldebibliothek der App bekommt sie als `webClientId` und laesst Google
 * das Token darauf ausstellen. Apple: die Bundle-ID der App; auf der
 * Website ist es die Services ID, in der App die App selbst.
 *
 * Eine leere Liste heisst: dieser Weg ist nicht eingerichtet, und die
 * Pruefung lehnt jedes Token ab.
 */
export const APP_BUNDLE_ID = 'com.levizz.app';

export function nativeAudience(
  provider: 'google' | 'apple',
  env: Record<string, string | undefined> = process.env,
): string[] {
  if (provider === 'google') {
    const id = env.AUTH_GOOGLE_ID?.trim();
    return id ? [id] : [];
  }
  return [env.AUTH_APPLE_APP_ID?.trim() || APP_BUNDLE_ID];
}
