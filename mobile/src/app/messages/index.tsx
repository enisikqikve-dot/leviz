import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { Button, Empty, Txt } from '~/components/ui';
import { imageUrl } from '~/lib/api';
import { useAuth } from '~/lib/auth';
import { useI18n } from '~/lib/i18n';
import { useConversations } from '~/lib/queries';
import { fonts, radius, spacing, useTheme } from '~/lib/theme';
import type { Conversation } from '~/lib/types';

/**
 * Die Gespraeche -- ein Faden je Fahrzeug und Kaeufer, neueste Nachricht
 * zuerst. Ungelesen ist, was nach dem letzten Ansehen von der Gegenseite kam.
 */
export default function MessagesScreen() {
  const theme = useTheme();
  const { t, locale } = useI18n();
  const router = useRouter();
  const { user, ready } = useAuth();
  const { data, isPending, isRefetching, refetch } = useConversations(Boolean(user));

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

  const items = data?.items ?? [];

  return (
    <FlatList
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl }}
      data={items}
      keyExtractor={(c) => c.id}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.primary} />}
      ListHeaderComponent={
        <View style={{ marginBottom: spacing.sm }}>
          <Txt variant="h1">{t('messages.title')}</Txt>
          {data?.unread ? <Txt variant="small" color={theme.muted}>{t('messages.unread', { count: data.unread })}</Txt> : null}
        </View>
      }
      ListEmptyComponent={
        <Empty title={t('messages.empty')} hint={t('messages.emptyHint')} action={<Button label={t('messages.browse')} variant="outline" onPress={() => router.push('/search')} />} />
      }
      renderItem={({ item }) => <Zeile item={item} locale={locale} onPress={() => router.push(`/messages/${item.id}`)} />}
    />
  );
}

function Zeile({ item, locale, onPress }: { item: Conversation; locale: string; onPress: () => void }) {
  const theme = useTheme();
  const { t } = useI18n();
  const wann = new Date(item.lastMessageAt);
  const heute = wann.toDateString() === new Date().toDateString();
  const zeit = wann.toLocaleString(locale === 'sq' ? 'sq-AL' : locale, heute ? { timeStyle: 'short' } : { dateStyle: 'short' });

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.zeile, { backgroundColor: item.unread ? theme.primarySoft : theme.card, borderColor: theme.border, opacity: pressed ? 0.7 : 1 }]}
    >
      <View style={[styles.bild, { backgroundColor: theme.mutedSurface }]}>
        {item.vehicle.image ? <Image source={{ uri: imageUrl(item.vehicle.image) }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} /> : null}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
          <Txt style={{ fontFamily: item.unread ? fonts.bold : fonts.semibold, flex: 1 }} numberOfLines={1}>{item.counterpartName}</Txt>
          <Txt variant="caption" color={theme.muted}>{zeit}</Txt>
        </View>
        <Txt variant="small" color={theme.muted} numberOfLines={1}>{item.vehicle.title}</Txt>
        {item.lastMessage ? (
          <Txt variant="small" numberOfLines={1} style={{ fontFamily: item.unread ? fonts.medium : fonts.regular }} color={item.unread ? theme.foreground : theme.muted}>
            {item.lastMessage.mine ? `${t('messages.you')}: ` : ''}{item.lastMessage.body}
          </Txt>
        ) : null}
        {item.status === 'BLOCKED' ? <Txt variant="caption" color={theme.destructive}>{t('messages.blocked')}</Txt> : null}
      </View>
      {item.unread ? <View style={[styles.punkt, { backgroundColor: theme.primary }]} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  mitte: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  zeile: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 12, borderRadius: radius.md, borderWidth: 1 },
  bild: { width: 64, height: 52, borderRadius: radius.sm, overflow: 'hidden' },
  punkt: { width: 8, height: 8, borderRadius: 4 },
});
