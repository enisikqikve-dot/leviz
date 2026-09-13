import { useRouter, type Href } from 'expo-router';
import { ActivityIndicator, Alert, FlatList, Platform, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { Button, Chip, Empty, Txt } from '~/components/ui';
import { useAuth } from '~/lib/auth';
import { useI18n } from '~/lib/i18n';
import { useSavedSearches, useSearchCommand } from '~/lib/queries';
import { fonts, radius, spacing, useTheme } from '~/lib/theme';
import type { SavedSearch } from '~/lib/types';

/**
 * Die gespeicherten Suchen -- mit der Zahl der Treffer und der Zahl der
 * neuen seit dem letzten Ansehen. Antippen oeffnet die Suche mit genau den
 * gespeicherten Filtern und markiert die neuen als gesehen.
 */
export default function SavedSearchesScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { user, ready } = useAuth();
  const { data, isPending, isRefetching, refetch } = useSavedSearches(Boolean(user));
  const befehl = useSearchCommand();

  if (!ready || (user && isPending)) {
    return <View style={styles.mitte}><ActivityIndicator color={theme.primary} /></View>;
  }
  if (!user) {
    return (
      <View style={[styles.mitte, { padding: spacing.lg }]}>
        <Empty title={t('auth.loginTitle')} action={<Button label={t('nav.login')} onPress={() => router.push('/login')} />} />
      </View>
    );
  }

  const oeffne = (s: SavedSearch) => {
    if (s.newCount > 0) befehl.mutate({ id: s.id, command: 'seen' });
    router.push({ pathname: '/search', params: s.query } as Href);
  };

  const loesche = (s: SavedSearch) => {
    const tun = () => befehl.mutate({ id: s.id, command: 'delete' });
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.(`${t('searches.delete')}: ${s.name}?`)) tun();
      return;
    }
    Alert.alert(t('searches.delete'), s.name, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: tun },
    ]);
  };

  return (
    <FlatList
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl }}
      data={data?.items ?? []}
      keyExtractor={(s) => s.id}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.primary} />}
      ListHeaderComponent={<Txt variant="h1" style={{ marginBottom: spacing.sm }}>{t('searches.title')}</Txt>}
      ListEmptyComponent={
        <Empty title={t('searches.empty')} hint={t('searches.emptyHint')} action={<Button label={t('search.title')} variant="outline" onPress={() => router.push('/search')} />} />
      }
      renderItem={({ item }) => (
        <Pressable onPress={() => oeffne(item)} style={({ pressed }) => [styles.zeile, { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.7 : 1 }]}>
          <View style={{ flex: 1, gap: 6 }}>
            <Txt style={{ fontFamily: fonts.semibold }}>{item.name}</Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              <Chip label={t('searches.filters', { count: item.filterCount })} />
              <Chip label={t('searches.matches', { count: item.matchCount })} />
              {item.newCount > 0 ? <Chip label={t('searches.newMatches', { count: item.newCount })} tone="success" /> : null}
            </View>
          </View>
          <Pressable onPress={() => loesche(item)} hitSlop={10}>
            <Txt variant="small" color={theme.destructive}>{t('searches.delete')}</Txt>
          </Pressable>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  mitte: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  zeile: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.md, borderWidth: 1 },
});
