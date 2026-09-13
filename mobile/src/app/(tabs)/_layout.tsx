import { Tabs } from 'expo-router';
import { Text, type ColorValue } from 'react-native';

import { useI18n } from '~/lib/i18n';
import { fonts, useTheme } from '~/lib/theme';

/**
 * Vier Reiter, wie die Kopfzeile der Website: Start, Suche, Merkliste, Konto.
 *
 * Die Symbole sind Zeichen, keine Bildersammlung -- ein Paket weniger, und
 * auf beiden Plattformen gleich.
 */
const ICONS = { index: '⌂', search: '⌕', favorites: '♡', account: '◯' } as const;

function Icon({ name, color }: { name: keyof typeof ICONS; color: ColorValue }) {
  return <Text style={{ fontSize: 20, color, lineHeight: 24 }}>{ICONS[name]}</Text>;
}

export default function TabsLayout() {
  const theme = useTheme();
  const { t } = useI18n();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.muted,
        tabBarStyle: { backgroundColor: theme.card, borderTopColor: theme.border },
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('brand.name'), tabBarIcon: ({ color }) => <Icon name="index" color={color} /> }} />
      <Tabs.Screen name="search" options={{ title: t('nav.search'), tabBarIcon: ({ color }) => <Icon name="search" color={color} /> }} />
      <Tabs.Screen name="favorites" options={{ title: t('nav.favorites'), tabBarIcon: ({ color }) => <Icon name="favorites" color={color} /> }} />
      <Tabs.Screen name="account" options={{ title: t('nav.dashboard'), tabBarIcon: ({ color }) => <Icon name="account" color={color} /> }} />
    </Tabs>
  );
}
