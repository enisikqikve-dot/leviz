import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Platform, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { formatPrice } from '@/lib/currency';

import { Button, Card, Chip, Empty, Txt } from '~/components/ui';
import { imageUrl } from '~/lib/api';
import { useAuth } from '~/lib/auth';
import { useI18n } from '~/lib/i18n';
import { useListingCommand, useMyListings, type ListingCommand } from '~/lib/queries';
import { fonts, radius, spacing, useTheme } from '~/lib/theme';
import type { ListingStatus, OwnListing } from '~/lib/types';

/**
 * "Meine Inserate" -- dieselbe Liste wie im Dashboard der Website, mit
 * denselben Handgriffen: bearbeiten, pausieren, verkauft, loeschen.
 *
 * Ein Entwurf hat einen Knopf "Veroeffentlichen" direkt in der Karte; das
 * ist auf dem Telefon der haeufigste Weg -- Fotos abends machen, morgens
 * freigeben.
 */
const STATUS_TONE: Record<ListingStatus, 'success' | 'warning' | 'muted' | 'primary'> = {
  ACTIVE: 'success', PENDING_REVIEW: 'warning', PAUSED: 'muted', DRAFT: 'muted',
  SOLD: 'primary', REJECTED: 'warning', EXPIRED: 'warning',
};

export default function MyListingsScreen() {
  const theme = useTheme();
  const { t, locale } = useI18n();
  const router = useRouter();
  const { user, ready } = useAuth();
  const { data, isPending, refetch, isRefetching } = useMyListings(Boolean(user));
  const befehl = useListingCommand();
  const [laufend, setLaufend] = useState<string | null>(null);

  const fuehreAus = async (id: string, command: ListingCommand) => {
    setLaufend(id);
    try {
      await befehl.mutateAsync({ id, command });
    } catch {
      Alert.alert(t('common.error'));
    } finally {
      setLaufend(null);
    }
  };

  const loeschen = (id: string) => {
    // Auf dem Web gibt es Alert mit Knoepfen nicht -- dort fragt der Browser.
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.(t('myListings.confirmDelete'))) fuehreAus(id, 'delete');
      return;
    }
    Alert.alert(t('myListings.delete'), t('myListings.confirmDelete'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => fuehreAus(id, 'delete') },
    ]);
  };

  if (!ready || (user && isPending)) {
    return <View style={styles.mitte}><ActivityIndicator color={theme.primary} /></View>;
  }

  if (!user) {
    return (
      <View style={[styles.mitte, { padding: spacing.lg }]}>
        <Empty title={t('listing.loginRequired')} action={<Button label={t('nav.login')} onPress={() => router.push('/login')} />} />
      </View>
    );
  }

  const items = data?.items ?? [];

  return (
    <FlatList
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl }}
      data={items}
      keyExtractor={(v) => v.id}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.primary} />}
      ListHeaderComponent={
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, marginBottom: spacing.sm }}>
          <Txt variant="h1">{t('myListings.title')}</Txt>
          <Button label={t('myListings.create')} onPress={() => router.push('/listings/new')} style={{ height: 40, paddingHorizontal: 14 }} />
        </View>
      }
      ListEmptyComponent={
        <Empty title={t('myListings.empty')} hint={t('myListings.emptyHint')} action={<Button label={t('myListings.create')} onPress={() => router.push('/listings/new')} />} />
      }
      renderItem={({ item }) => (
        <Eintrag
          item={item}
          locale={locale}
          beschaeftigt={laufend === item.id}
          onEdit={() => router.push(`/listings/${item.id}`)}
          onOpen={() => router.push(`/vehicle/${item.slug}`)}
          onCommand={(c) => (c === 'delete' ? loeschen(item.id) : fuehreAus(item.id, c))}
        />
      )}
    />
  );
}

function Eintrag({
  item, locale, beschaeftigt, onEdit, onOpen, onCommand,
}: {
  item: OwnListing;
  locale: 'sq' | 'de' | 'en';
  beschaeftigt: boolean;
  onEdit: () => void;
  onOpen: () => void;
  onCommand: (command: ListingCommand) => void;
}) {
  const theme = useTheme();
  const { t } = useI18n();
  const oeffentlich = item.status === 'ACTIVE' || item.status === 'SOLD';

  return (
    <Card style={{ opacity: beschaeftigt ? 0.6 : 1 }}>
      <Pressable onPress={oeffentlich ? onOpen : onEdit} style={{ flexDirection: 'row', gap: spacing.md, padding: spacing.md }}>
        <View style={[styles.bild, { backgroundColor: theme.mutedSurface }]}>
          {item.image ? <Image source={{ uri: imageUrl(item.image) }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} /> : null}
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            <Chip label={t(`myListings.status.${item.status}`)} tone={STATUS_TONE[item.status]} />
            {item.featuredUntil && new Date(item.featuredUntil) > new Date() ? <Chip label={t('vehicles.badges.featured')} tone="warning" /> : null}
          </View>
          <Txt style={{ fontFamily: fonts.semibold }} numberOfLines={2}>{item.title}</Txt>
          <Txt style={{ fontFamily: fonts.bold }}>{formatPrice(item.priceCents, { locale })}</Txt>
          <Txt variant="small" color={theme.muted}>
            {item.viewCount} {t('myListings.views')} · {item.inquiryCount} {t('myListings.inquiries')} · {item.favoriteCount} {t('myListings.favorites')} · {t('myListings.quality')} {item.qualityScore}%
          </Txt>
        </View>
      </Pressable>

      <View style={[styles.aktionen, { borderColor: theme.border }]}>
        {item.status === 'DRAFT' ? <Aktion label={t('listing.nav.publish')} onPress={() => onCommand('publish')} primary /> : null}
        <Aktion label={t('myListings.edit')} onPress={onEdit} />
        {item.status === 'ACTIVE' ? <Aktion label={t('myListings.pause')} onPress={() => onCommand('pause')} /> : null}
        {item.status === 'PAUSED' ? <Aktion label={t('myListings.resume')} onPress={() => onCommand('pause')} /> : null}
        {item.status === 'ACTIVE' || item.status === 'PAUSED' ? <Aktion label={t('myListings.markSold')} onPress={() => onCommand('sold')} /> : null}
        <Aktion label={t('myListings.delete')} onPress={() => onCommand('delete')} destructive />
      </View>
    </Card>
  );
}

function Aktion({ label, onPress, primary, destructive }: { label: string; onPress: () => void; primary?: boolean; destructive?: boolean }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.aktion, { opacity: pressed ? 0.6 : 1 }]}>
      <Txt variant="small" style={{ fontFamily: fonts.medium }} color={destructive ? theme.destructive : primary ? theme.primary : theme.foreground}>
        {label}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  mitte: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bild: { width: 92, height: 72, borderRadius: radius.md, overflow: 'hidden' },
  aktionen: { flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: 1, paddingHorizontal: 6 },
  aktion: { paddingHorizontal: 10, paddingVertical: 12 },
});
