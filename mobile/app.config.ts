import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Ergaenzt app.json um das, was erst beim Bauen feststeht.
 *
 * Die Google-Anmeldung auf iOS braucht ein URL-Schema aus der iOS-Client-ID
 * (`com.googleusercontent.apps.<Nummer>`), damit der Google-Dialog in die
 * App zurueckfindet. Der Wert kommt als Umgebungsvariable
 * GOOGLE_IOS_URL_SCHEME -- lokal aus .env.local, bei EAS als
 * Projektvariable. Fehlt er, bleibt das Plugin weg, und der Google-Knopf
 * bleibt auf iOS aus (src/lib/social.ts prueft die Client-IDs). Android
 * braucht das Plugin nicht: dort reicht die Client-ID in der Google-Konsole.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const schema = process.env.GOOGLE_IOS_URL_SCHEME?.trim();

  return {
    ...config,
    name: config.name ?? 'LEVIZ',
    slug: config.slug ?? 'leviz',
    plugins: [
      ...(config.plugins ?? []),
      ...(schema ? [['@react-native-google-signin/google-signin', { iosUrlScheme: schema }] as [string, unknown]] : []),
    ],
  };
};
