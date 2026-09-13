import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AuthProvider } from '~/lib/auth';
import { defaultLocale, I18nContext, translate, type Locale } from '~/lib/i18n';
import { useTheme } from '~/lib/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * Daten bleiben eine Minute frisch und werden nicht bei jedem Wischen neu
 * geholt -- auf einer Trefferliste mit Fotos zaehlt jede Anfrage.
 */
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
});

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
          <AuthProvider>
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
            </Stack>
          </AuthProvider>
        </QueryClientProvider>
      </I18nContext.Provider>
    </GestureHandlerRootView>
  );
}
