import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AnalyticsProvider } from '~/lib/analytics';
import { api } from '~/lib/api';
import { AuthProvider } from '~/lib/auth';
import { defaultLocale, I18nContext, translate, type Locale } from '~/lib/i18n';
import { openTarget } from '~/lib/links';
import { addResponseListener, initPush, lastResponse, targetOf } from '~/lib/push';
import { useTheme } from '~/lib/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * Daten bleiben eine Minute frisch und werden nicht bei jedem Wischen neu
 * geholt -- auf einer Trefferliste mit Fotos zaehlt jede Anfrage.
 */
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
});

/**
 * Angetippte Push-Meldungen: beim Start (App war zu) und im Betrieb.
 *
 * Das Ziel steht in `data.href` -- eine Website-Adresse, die `openTarget`
 * mit derselben Tabelle wie die Website auf einen Bildschirm abbildet. Die
 * Meldung gilt als gelesen, sobald sie angetippt wurde.
 */
function PushTaps() {
  const router = useRouter();
  const client = useQueryClient();

  useEffect(() => {
    if (Platform.OS === 'web') return;
    void initPush();

    const behandle = (response: Parameters<typeof targetOf>[0]) => {
      const ziel = targetOf(response);
      if (!ziel) return;
      if (ziel.notificationId) {
        api(`/notifications/${ziel.notificationId}/read`, { method: 'POST' })
          .catch(() => {})
          .finally(() => client.invalidateQueries({ queryKey: ['notifications'] }));
      }
      openTarget(router, ziel.href);
    };

    lastResponse().then((r) => r && behandle(r)).catch(() => {});
    const abo = addResponseListener(behandle);
    return () => abo.remove();
  }, [router, client]);

  return null;
}

export default function RootLayout() {
  const theme = useTheme();
  const [locale, setLocale] = useState<Locale>(defaultLocale);
  const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  const i18n = useMemo(
    () => ({ locale, setLocale, t: (key: string, values?: Record<string, string | number | Date>) => translate(locale, key, values) }),
    [locale],
  );

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <I18nContext.Provider value={i18n}>
        <QueryClientProvider client={queryClient}>
          <AnalyticsProvider>
          <AuthProvider>
            <PushTaps />
            <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: theme.background },
                headerTintColor: theme.foreground,
                headerShadowVisible: false,
                contentStyle: { backgroundColor: theme.background },
                headerTitleStyle: { fontFamily: 'Inter_600SemiBold' },
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="vehicle/[slug]" options={{ title: '' }} />
              <Stack.Screen name="login" options={{ presentation: 'modal', title: '' }} />
              <Stack.Screen name="register" options={{ presentation: 'modal', title: '' }} />
              <Stack.Screen name="filters" options={{ presentation: 'modal', title: '' }} />
              <Stack.Screen name="listings/index" options={{ title: '' }} />
              <Stack.Screen name="listings/new" options={{ title: '' }} />
              <Stack.Screen name="listings/[id]" options={{ title: '' }} />
              <Stack.Screen name="profile" options={{ title: '' }} />
              <Stack.Screen name="notifications" options={{ title: '' }} />
              <Stack.Screen name="messages/index" options={{ title: '' }} />
              <Stack.Screen name="messages/[id]" options={{ title: '' }} />
              <Stack.Screen name="messages/new" options={{ presentation: 'modal', title: '' }} />
              <Stack.Screen name="searches" options={{ title: '' }} />
              <Stack.Screen name="dealers" options={{ title: '' }} />
              <Stack.Screen name="dealer/[slug]" options={{ title: '' }} />
            </Stack>
          </AuthProvider>
          </AnalyticsProvider>
        </QueryClientProvider>
      </I18nContext.Provider>
    </GestureHandlerRootView>
  );
}
