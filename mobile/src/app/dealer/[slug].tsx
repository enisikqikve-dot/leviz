import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, Linking, StyleSheet, View } from 'react-native';

import { Button, Card, Chip, Empty, Txt } from '~/components/ui';
import { VehicleCard } from '~/components/vehicle-card';
import { imageUrl } from '~/lib/api';
import { useI18n } from '~/lib/i18n';
import { useDealer, useSearch } from '~/lib/queries';
import { fonts, radius, spacing, useTheme } from '~/lib/theme';

/**
 * Das Haendlerprofil: Kontakt, Oeffnungszeiten, Bewertungen -- und darunter
 * der Bestand, seitenweise, ueber dieselbe Suche wie ueberall
 * (GET /vehicles?dealer=slug).
 */
const WOCHENTAGE = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

export default function DealerScreen() {
  const theme = useTheme();
  const { t, locale } = useI18n();
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data: dealer, isPending, isError } = useDealer(slug);
  const bestand = useSearch({ dealer: slug, sort: 'newest' });
  const fahrzeuge = bestand.data?.pages.flatMap((p) => p.items) ?? [];

  if (isPending) return <View style={styles.mitte}><ActivityIndicator color={theme.primary} /></View>;
  if (isError || !dealer) {
    return (
      <View style={[styles.mitte, { padding: spacing.lg }]}>
        <Empty title={t('common.notFoundTitle')} action={<Button label={t('common.back')} variant="outline" onPress={() => router.back()} />} />
      </View>
    );
  }

  const landName = dealer.country ? dealer.country[{ sq: 'nameSq', de: 'nameDe', en: 'nameEn' }[locale] as 'nameSq'] : null;
  const stunden = dealer.openingHours;

  return (
    <FlatList
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl }}
      data={fahrzeuge}
      keyExtractor={(v) => v.id}
      renderItem={({ item }) => <VehicleCard vehicle={item} />}
      onEndReached={() => bestand.hasNextPage && !bestand.isFetchingNextPage && bestand.fetchNextPage()}
      onEndReachedThreshold={0.6}
      ListHeaderComponent={
        <View style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
            <View style={[styles.logo, { backgroundColor: theme.mutedSurface }]}>
              {dealer.logoUrl ? <Image source={{ uri: imageUrl(dealer.logoUrl) }} style={StyleSheet.absoluteFill} contentFit="cover" /> : (
                <Txt variant="h1" color={theme.muted}>{dealer.companyName.slice(0, 1)}</Txt>
              )}
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Txt variant="h1">{dealer.companyName}</Txt>
              <Txt variant="small" color={theme.muted}>{[dealer.city?.name, landName].filter(Boolean).join(', ')}</Txt>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {dealer.verified ? <Chip label={t('vehicles.badges.verified')} tone="success" /> : null}
                <Chip label={t('dealers.vehicles', { count: dealer.vehicleCount })} />
                <Chip label={dealer.ratingCount > 0 ? `★ ${dealer.ratingAvg.toFixed(1)} · ${t('dealers.reviews', { count: dealer.ratingCount })}` : t('dealers.noReviews')} />
              </View>
            </View>
          </View>

          {dealer.description ? (
            <Card style={{ padding: spacing.lg, gap: 6 }}>
              <Txt variant="h2">{t('dealerProfile.about')}</Txt>
              <Txt color={theme.muted}>{dealer.description}</Txt>
            </Card>
          ) : null}

          <Card style={{ padding: spacing.lg, gap: spacing.sm }}>
            <Txt variant="h2">{t('dealerProfile.contact')}</Txt>
            {dealer.addressLine ? <Txt variant="small" color={theme.muted}>{[dealer.addressLine, dealer.postalCode, dealer.city?.name].filter(Boolean).join(', ')}</Txt> : null}
            {dealer.phone ? <Button label={`${t('vehicleDetail.callSeller')} · ${dealer.phone}`} onPress={() => Linking.openURL(`tel:${dealer.phone}`)} /> : null}
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {dealer.website ? <Button label={t('vehicleDetail.seller.website')} variant="outline" style={{ flex: 1 }} onPress={() => Linking.openURL(dealer.website!)} /> : null}
              {dealer.publicEmail ? <Button label="E-Mail" variant="outline" style={{ flex: 1 }} onPress={() => Linking.openURL(`mailto:${dealer.publicEmail}`)} /> : null}
            </View>
            {stunden ? (
              <View style={{ gap: 4, marginTop: 4 }}>
                <Txt variant="caption" color={theme.muted}>{t('dealerProfile.openingHours').toUpperCase()}</Txt>
                {WOCHENTAGE.map((tag) => (
                  <View key={tag} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Txt variant="small" color={theme.muted}>{tag.toUpperCase()}</Txt>
                    <Txt variant="small" style={{ fontFamily: fonts.medium }}>{stunden[tag] ?? t('dealerProfile.closed')}</Txt>
                  </View>
                ))}
              </View>
            ) : null}
          </Card>

          {dealer.reviews.length > 0 ? (
            <Card style={{ padding: spacing.lg, gap: spacing.sm }}>
              <Txt variant="h2">{t('dealerProfile.reviews')}</Txt>
              {dealer.reviews.map((r) => (
                <View key={r.id} style={{ gap: 2, paddingTop: 6, borderTopWidth: 1, borderColor: theme.border }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Txt variant="small" style={{ fontFamily: fonts.medium }}>{r.author.name ?? '—'}</Txt>
                    <Txt variant="small" color={theme.featured}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</Txt>
                  </View>
                  {r.title ? <Txt variant="small" style={{ fontFamily: fonts.medium }}>{r.title}</Txt> : null}
                  {r.body ? <Txt variant="small" color={theme.muted}>{r.body}</Txt> : null}
                </View>
              ))}
            </Card>
          ) : null}

          <Txt variant="h2" style={{ marginTop: spacing.sm }}>{t('dealerProfile.inventory')}</Txt>
        </View>
      }
      ListEmptyComponent={
        bestand.isLoading ? <ActivityIndicator color={theme.primary} /> : <Empty title={t('dealerProfile.noVehicles')} hint={t('dealerProfile.noVehiclesHint')} />
      }
    />
  );
}

const styles = StyleSheet.create({
  mitte: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 72, height: 72, borderRadius: radius.md, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
});
