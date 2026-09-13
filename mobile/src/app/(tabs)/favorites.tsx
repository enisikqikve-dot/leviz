import { useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Empty, Txt } from '~/components/ui';
import { VehicleCard } from '~/components/vehicle-card';
import { useAuth } from '~/lib/auth';
import { useI18n } from '~/lib/i18n';
import { useFavorites } from '~/lib/queries';
import { spacing, useTheme } from '~/lib/theme';

/**
 * Die Merkliste -- dieselbe wie auf der Website, weil es dieselbe Tabelle ist.
 *
 * Was am Rechner gemerkt wurde, steht hier; was hier gemerkt wird, steht dort.
 * Ohne Anmeldung gibt es keine Merkliste, nur den Weg zur Anmeldung: eine
 * Liste nur auf dem Geraet waere beim naechsten Telefon weg.
 */
export default function FavoritesScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, ready } = useAuth();
  const { data, isLoading, isError, refetch } = useFavorites(Boolean(user));

  const kopf = (
    <View style={{ paddingHorizontal: spacing.lg, paddingTop: insets.top + spacing.md, paddingBottom: spacing.md }}>
      <Txt variant="h1">{t('favorites.title')}</Txt>
      {data ? <Txt variant="small" color={theme.muted}>{t('favorites.count', { count: data.items.length })}</Txt> : null}
    </View>
  );

  if (!ready) return <ActivityIndicator style={{ marginTop: spacing.xxl }} color={theme.primary} />;

  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        {kopf}
        <View style={{ padding: spacing.lg }}>
          <Empty
            title={t('favorites.empty')}
            hint={t('favorites.emptyHint')}
            action={<Button label={t('nav.login')} onPress={() => router.push('/login')} />}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <FlatList
        data={data?.items ?? []}
        keyExtractor={(e) => e.vehicle.id}
        renderItem={({ item }) => <VehicleCard vehicle={item.vehicle} />}
        ListHeaderComponent={kopf}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl }}
        refreshing={isLoading}
        onRefresh={() => refetch()}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator color={theme.primary} style={{ marginTop: spacing.xl }} />
          ) : isError ? (
            <Empty title={t('common.error')} action={<Button label={t('common.retry')} variant="outline" onPress={() => refetch()} />} />
          ) : (
            <Empty
              title={t('favorites.empty')}
              hint={t('favorites.emptyHint')}
              action={<Button label={t('favorites.browse')} onPress={() => router.push('/search')} />}
            />
          )
        }
      />
    </View>
  );
}
