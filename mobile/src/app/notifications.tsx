import { useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { Button, Empty, Txt } from '~/components/ui';
import { useAuth } from '~/lib/auth';
import { useI18n } from '~/lib/i18n';
import { openTarget, targetFor } from '~/lib/links';
import { useMarkNotificationRead, useNotifications } from '~/lib/queries';
import { fonts, radius, spacing, useTheme } from '~/lib/theme';
import type { Notification } from '~/lib/types';

/**
 * Die Meldungen -- der erste Bildschirm im ganzen Projekt, der sie zeigt.
 *
 * Zehn Arten wurden bisher geschrieben und nie gelesen: neue Nachricht,
 * Freigabe, Ablehnung, Preisaenderung, Zahlung. Antippen markiert als
 * gelesen und fuehrt dorthin, wo es hingehoert -- in der App, wenn sie den
 * Bildschirm hat, sonst auf die Website.
 */
export default function NotificationsScreen() {
  const theme = useTheme();
  const { t, locale } = useI18n();
  const router = useRouter();
  const { user, ready } = useAuth();
  const { data, isPending, isRefetching, refetch, fetchNextPage, hasNextPage } = useNotifications(Boolean(user));
  const markiere = useMarkNotificationRead();

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

  const items = data?.pages.flatMap((p) => p.items) ?? [];
  const unread = data?.pages[0]?.unread ?? 0;

  const oeffne = (n: Notification) => {
    if (!n.readAt) markiere.mutate(n.id);
    if (n.href) openTarget(router, n.href);
  };

  return (
    <FlatList
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl }}
      data={items}
      keyExtractor={(n) => n.id}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.primary} />}
      onEndReached={() => hasNextPage && fetchNextPage()}
      ListHeaderComponent={
        <View style={{ marginBottom: spacing.sm }}>
          <Txt variant="h1">{t('notifications.title')}</Txt>
          <Txt variant="small" color={theme.muted}>{t('notifications.unread', { count: unread })}</Txt>
        </View>
      }
      ListEmptyComponent={<Empty title={t('notifications.empty')} hint={t('notifications.emptyHint')} />}
      renderItem={({ item }) => {
        const ungelesen = !item.readAt;
        const inApp = item.href ? 'href' in targetFor(item.href) : false;
        return (
          <Pressable
            onPress={() => oeffne(item)}
            style={({ pressed }) => [
              styles.zeile,
              { backgroundColor: ungelesen ? theme.primarySoft : theme.card, borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View style={[styles.punkt, { backgroundColor: ungelesen ? theme.primary : 'transparent' }]} />
            <View style={{ flex: 1, gap: 2 }}>
              <Txt style={{ fontFamily: ungelesen ? fonts.semibold : fonts.medium }}>{item.title}</Txt>
              {item.body ? <Txt variant="small" color={theme.muted} numberOfLines={2}>{item.body}</Txt> : null}
              <Txt variant="caption" color={theme.muted}>
                {new Date(item.createdAt).toLocaleString(locale === 'sq' ? 'sq-AL' : locale, { dateStyle: 'medium', timeStyle: 'short' })}
                {item.href && !inApp ? ` · ${t('notifications.openOnWeb')}` : ''}
              </Txt>
            </View>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  mitte: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  zeile: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', padding: 14, borderRadius: radius.md, borderWidth: 1 },
  punkt: { width: 8, height: 8, borderRadius: 4, marginTop: 7 },
});
