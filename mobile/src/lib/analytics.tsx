import { usePathname, useSegments } from 'expo-router';
import { PostHogProvider, usePostHog } from 'posthog-react-native';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { prefsStore } from './api';

/**
 * Nutzungsdaten und Absturzberichte -- hinter einer Abstraktion, wie
 * `lib/email` auf dem Server.
 *
 * Dahinter steht PostHog (EU). Ohne Schluessel (`EXPO_PUBLIC_POSTHOG_API_KEY`
 * fehlt) laeuft nichts nach draussen, und im Entwicklungsmodus steht das
 * einmal im Protokoll -- kein stiller Mock.
 *
 * Grundsaetze:
 *  - `identify` nur mit der Nutzerkennung, nie mit Name oder E-Mail.
 *  - Kein Session-Replay, kein Mitschneiden von Tippen.
 *  - Ein Schalter im Konto ("Nutzungsdaten teilen"). Aus heisst aus: PostHog
 *    schickt dann nichts mehr, auch keine Absturzberichte.
 */
const API_KEY = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
const HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com';
const SCHALTER = 'leviz.analytics';

/**
 * Auf dem Telefon speichert PostHog ueber expo-file-system. Die Web-Fassung
 * (Entwicklung) hat das nicht -- dort reicht der localStorage des Browsers.
 */
const webSpeicher = Platform.OS === 'web'
  ? {
      getItem: (key: string) => globalThis.localStorage?.getItem(key) ?? null,
      setItem: (key: string, value: string) => void globalThis.localStorage?.setItem(key, value),
    }
  : undefined;

export type Properties = Record<string, string | number | boolean | null | undefined>;

export type Analytics = {
  /** Ob PostHog ueberhaupt eingerichtet ist -- fuer die Anzeige des Schalters. */
  available: boolean;
  enabled: boolean;
  setEnabled: (value: boolean) => Promise<void>;
  track: (event: string, properties?: Properties) => void;
  screen: (name: string, properties?: Properties) => void;
  identify: (userId: string) => void;
  reset: () => void;
};

const AnalyticsContext = createContext<Analytics | null>(null);

export function useAnalytics(): Analytics {
  const a = useContext(AnalyticsContext);
  if (!a) throw new Error('useAnalytics ausserhalb von AnalyticsProvider');
  return a;
}

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  if (!API_KEY) {
    return <Stumm>{children}</Stumm>;
  }

  return (
    <PostHogProvider
      apiKey={API_KEY}
      autocapture={{ captureScreens: false, captureTouches: false }}
      options={{
        host: HOST,
        customStorage: webSpeicher,
        enableSessionReplay: false,
        captureAppLifecycleEvents: true,
        errorTracking: { autocapture: { uncaughtExceptions: true, unhandledRejections: true } },
      }}
    >
      <Verbunden>{children}</Verbunden>
    </PostHogProvider>
  );
}

/** Ohne Schluessel: alles laeuft ins Leere, im Entwicklungsmodus mit Hinweis. */
function Stumm({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (__DEV__) console.info('  LEVIZ Analytics: kein EXPO_PUBLIC_POSTHOG_API_KEY -- es wird nichts erfasst.');
  }, []);

  const wert = useMemo<Analytics>(
    () => ({
      available: false,
      enabled: false,
      setEnabled: async () => {},
      track: () => {},
      screen: () => {},
      identify: () => {},
      reset: () => {},
    }),
    [],
  );
  return <AnalyticsContext.Provider value={wert}>{children}</AnalyticsContext.Provider>;
}

function Verbunden({ children }: { children: ReactNode }) {
  const posthog = usePostHog();
  const [enabled, setEnabledState] = useState(true);

  // Der gespeicherte Schalter gilt vor der ersten Erfassung.
  useEffect(() => {
    prefsStore
      .get(SCHALTER)
      .then((wert) => {
        if (wert === 'off') {
          setEnabledState(false);
          return posthog.optOut();
        }
        return posthog.optIn();
      })
      .catch(() => {});
  }, [posthog]);

  const setEnabled = useCallback(
    async (wert: boolean) => {
      setEnabledState(wert);
      await prefsStore.set(SCHALTER, wert ? 'on' : 'off');
      if (wert) await posthog.optIn();
      else await posthog.optOut();
    },
    [posthog],
  );

  const analytics = useMemo<Analytics>(
    () => ({
      available: true,
      enabled,
      setEnabled,
      track: (event, properties) => void posthog.capture(event, sauber(properties)),
      screen: (name, properties) => void posthog.screen(name, sauber(properties)),
      identify: (userId) => posthog.identify(userId),
      reset: () => posthog.reset(),
    }),
    [posthog, enabled, setEnabled],
  );

  return (
    <AnalyticsContext.Provider value={analytics}>
      <ScreenTracker />
      {children}
    </AnalyticsContext.Provider>
  );
}

/** Leere Werte fallen weg -- PostHog will JSON, kein `undefined`. */
function sauber(properties?: Properties): Record<string, string | number | boolean | null> | undefined {
  if (!properties) return undefined;
  return Object.fromEntries(Object.entries(properties).filter(([, v]) => v !== undefined)) as Record<string, string | number | boolean | null>;
}

/**
 * Jeder Bildschirmwechsel als `$screen` -- mit dem Muster der Route
 * (`/vehicle/[slug]`), nicht der konkreten Adresse. Der Slug kommt als
 * Eigenschaft mit; das ist ein oeffentliches Inserat, keine Person.
 */
function ScreenTracker() {
  const posthog = usePostHog();
  const pathname = usePathname();
  const segments = useSegments();

  useEffect(() => {
    const muster = '/' + segments.filter((s) => !s.startsWith('(')).join('/');
    void posthog.screen(muster || '/', { path: pathname });
  }, [pathname, segments, posthog]);

  return null;
}
