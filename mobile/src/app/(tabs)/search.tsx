import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SORT_OPTIONS } from '@/features/search/schema';

import { Button, Chip, Empty, Txt } from '~/components/ui';
import { VehicleCard } from '~/components/vehicle-card';
import { useI18n } from '~/lib/i18n';
import { useSearch, type SearchFilters } from '~/lib/queries';
import { fonts, radius, spacing, useTheme } from '~/lib/theme';

/**
 * Die Suche -- dieselben Filternamen wie /kerko.
 *
 * Die Filter stehen in der Adresse des Bildschirms (Expo Router), genau wie
 * auf der Website in der URL. Ein Deep Link levizz.com/kerko?make=bmw wird
 * damit spaeter ohne Umweg zu diesem Bildschirm mit denselben Parametern.
 */
export default function SearchScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<Record<string, string>>();

  const [text, setText] = useState(params.q ?? '');

  const filters = useMemo<SearchFilters>(() => {
    const { q: _q, ...rest } = params;
    return { ...rest, q: text.trim() || undefined };
  }, [params, text]);

  const aktiveFilter = Object.entries(filters).filter(([k, v]) => v && k !== 'q' && k !== 'sort').length;

  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useSearch(filters);
  const treffer = data?.pages.flatMap((p) => p.items) ?? [];
  const gesamt = data?.pages[0]?.total ?? 0;

  const setSort = (sort: string) => router.setParams({ ...params, sort });

  return (
    <View style={{ flex: 1, backgroundColor: theme.background, paddingTop: insets.top }}>
      <View style={styles.kopf}>
        <Txt variant="h1">{t('search.title')}</Txt>

        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={t('home.hero.make') + ', ' + t('home.hero.model') + '…'}
          placeholderTextColor={theme.muted}
          returnKeyType="search"
          style={[styles.suche, { backgroundColor: theme.card, borderColor: theme.border, color: theme.foreground }]}
        />

        <View style={styles.zeile}>
          <Pressable
            onPress={() => router.push({ pathname: '/filters', params })}
            style={[styles.filterKnopf, { backgroundColor: theme.card, borderColor: aktiveFilter ? theme.primary : theme.border }]}
          >
            <Txt variant="small" style={{ fontFamily: fonts.medium }} color={aktiveFilter ? theme.primary : theme.foreground}>
              ⚙ {t('search.filters')}{aktiveFilter ? ` · ${aktiveFilter}` : ''}
            </Txt>
          </Pressable>
          <Txt variant="small" color={theme.muted}>
            {isLoading ? t('search.loading') : gesamt === 1 ? t('search.resultsOne') : t('search.resultsMany', { count: gesamt })}
          </Txt>
        </View>

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={SORT_OPTIONS.filter((s) => s !== 'distance')}
          keyExtractor={(s) => s}
          contentContainerStyle={{ gap: 6 }}
          renderItem={({ item }) => (
            <Chip label={t(`search.sort.${item}`)} active={(params.sort ?? 'relevance') === item} onPress={() => setSort(item)} />
          )}
        />
      </View>

      {isError ? (
        <View style={{ padding: spacing.lg, gap: spacing.md }}>
          <Txt color={theme.muted}>{t('common.error')}</Txt>
          <Button label={t('common.retry')} variant="outline" onPress={() => refetch()} />
        </View>
      ) : (
        <FlatList
          data={treffer}
          keyExtractor={(v) => v.id}
          renderItem={({ item }) => <VehicleCard vehicle={item} />}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl }}
          onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
          onEndReachedThreshold={0.6}
          ListEmptyComponent={
            isLoading ? <ActivityIndicator color={theme.primary} style={{ marginTop: spacing.xl }} /> : (
              <Empty
                title={t('search.noResults')}
                hint={t('search.noResultsHint')}
                action={aktiveFilter ? <Button label={t('search.clearFilters')} variant="outline" onPress={() => router.setParams({})} /> : undefined}
              />
            )
          }
          ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color={theme.primary} style={{ marginVertical: spacing.lg }} /> : null}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  kopf: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.md },
  suche: { height: 48, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: 14, fontFamily: fonts.regular, fontSize: 15 },
  zeile: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  filterKnopf: { height: 38, paddingHorizontal: 14, borderRadius: radius.md, borderWidth: 1, justifyContent: 'center' },
});
