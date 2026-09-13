import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Chip, Empty, Txt } from '~/components/ui';
import { imageUrl } from '~/lib/api';
import { useI18n } from '~/lib/i18n';
import { useDealers } from '~/lib/queries';
import { fonts, radius, spacing, useTheme } from '~/lib/theme';
import type { DealerCard } from '~/lib/types';

/** Das Haendlerverzeichnis -- dieselbe Abfrage wie /shitesit auf der Website. */
const SORTEN = ['rating', 'vehicles', 'name'] as const;

export default function DealersScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<(typeof SORTEN)[number]>('rating');
  const { data, isPending } = useDealers(q, sort);

  return (
    <FlatList
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl }}
      data={data?.items ?? []}
      keyExtractor={(d) => d.id}
      ListHeaderComponent={
        <View style={{ gap: spacing.md, marginBottom: spacing.sm }}>
          <View>
            <Txt variant="h1">{t('dealers.title')}</Txt>
            <Txt variant="small" color={theme.muted}>{t('dealers.subtitle')}</Txt>
          </View>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder={t('dealers.searchPlaceholder')}
            placeholderTextColor={theme.muted}
            style={[styles.suche, { backgroundColor: theme.card, borderColor: theme.border, color: theme.foreground }]}
          />
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {SORTEN.map((s) => (
              <Chip key={s} label={t(`dealers.sort${s[0].toUpperCase()}${s.slice(1)}`)} active={sort === s} onPress={() => setSort(s)} />
            ))}
          </View>
          {data ? <Txt variant="small" color={theme.muted}>{t('dealers.count', { count: data.items.length })}</Txt> : null}
        </View>
      }
      ListEmptyComponent={isPending ? <ActivityIndicator color={theme.primary} /> : <Empty title={t('dealers.empty')} hint={t('dealers.emptyHint')} />}
      renderItem={({ item }) => <Karte dealer={item} onPress={() => router.push(`/dealer/${item.slug}`)} />}
    />
  );
}

function Karte({ dealer, onPress }: { dealer: DealerCard; onPress: () => void }) {
  const theme = useTheme();
  const { t } = useI18n();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.karte, { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.7 : 1 }]}>
      <View style={[styles.logo, { backgroundColor: theme.mutedSurface }]}>
        {dealer.logoUrl ? <Image source={{ uri: imageUrl(dealer.logoUrl) }} style={StyleSheet.absoluteFill} contentFit="cover" /> : (
          <Txt variant="h2" color={theme.muted}>{dealer.companyName.slice(0, 1)}</Txt>
        )}
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Txt style={{ fontFamily: fonts.semibold, flexShrink: 1 }} numberOfLines={1}>{dealer.companyName}</Txt>
          {dealer.verified ? <Chip label={t('vehicles.badges.verified')} tone="success" /> : null}
        </View>
        <Txt variant="small" color={theme.muted}>
          {[dealer.city?.name, t('dealers.vehicles', { count: dealer.vehicleCount })].filter(Boolean).join(' · ')}
        </Txt>
        <Txt variant="small" color={theme.muted}>
          {dealer.ratingCount > 0 ? `★ ${dealer.ratingAvg.toFixed(1)} · ${t('dealers.reviews', { count: dealer.ratingCount })}` : t('dealers.noReviews')}
        </Txt>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  suche: { height: 46, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: 14, fontFamily: fonts.regular, fontSize: 15 },
  karte: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 12, borderRadius: radius.md, borderWidth: 1 },
  logo: { width: 56, height: 56, borderRadius: radius.sm, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
});
