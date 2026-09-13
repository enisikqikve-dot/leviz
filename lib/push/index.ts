import { ConsolePushProvider } from './console-provider';
import { ExpoPushProvider } from './expo-provider';
import type { PushProvider } from './types';

export type { PushMessage, PushProvider, PushReceipt, PushTicket } from './types';

let provider: PushProvider | undefined;

/**
 * Waehlt den Push-Anbieter anhand von PUSH_DRIVER. Ohne Konfiguration laeuft
 * das Terminal, damit die Anwendung ohne Zugangsschluessel benutzbar ist --
 * im Betrieb mit Hinweis im Protokoll, wie bei EMAIL_DRIVER.
 *
 * Ein unbekannter Wert faellt nicht still aufs Terminal zurueck: dann
 * bekaeme niemand je eine Meldung, und im Protokoll stuende nichts.
 */
export function getPushProvider(): PushProvider {
  if (provider) return provider;

  const driver = process.env.PUSH_DRIVER ?? 'console';

  if (driver === 'console') {
    if (process.env.NODE_ENV === 'production') {
      console.warn(
        '  LEVIZ: PUSH_DRIVER=console — Push-Meldungen erreichen kein Telefon. ' +
          'Fuer den Betrieb PUSH_DRIVER=expo setzen.',
      );
    }
    provider = new ConsolePushProvider();
    return provider;
  }

  if (driver === 'expo') {
    // Das Zugriffs-Token ist freiwillig; mit ihm lehnt Expo Anfragen ab, die
    // nicht von diesem Server kommen (Einstellung "Enhanced Security").
    provider = new ExpoPushProvider(process.env.EXPO_ACCESS_TOKEN || undefined);
    return provider;
  }

  throw new Error(`PUSH_DRIVER="${driver}" ist unbekannt. Moeglich sind "console" und "expo".`);
}

/** Nur fuer Tests: erzwingt beim naechsten Zugriff eine neue Auswahl. */
export function resetPushProvider(): void {
  provider = undefined;
}
