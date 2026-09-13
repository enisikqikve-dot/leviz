import { useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Logo } from '~/components/logo';
import { Button, Card, Chip, Txt } from '~/components/ui';
import { useAuth } from '~/lib/auth';
import { locales, useI18n, type Locale } from '~/lib/i18n';
import { useConversations, useNotifications } from '~/lib/queries';
import { spacing, useTheme } from '~/lib/theme';

/**
 * Das Konto: wer man ist, die Sprache, die Abmeldung -- und der Einstieg zu
 * allem Eigenen: Inserate, Nachrichten, Meldungen, Suchauftraege, Profil.
 */
export default function AccountScreen() {
  const theme = useTheme();
  const { t, locale, setLocale } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, ready, logout } = useAuth();
  const { data: meldungen } = useNotifications(Boolean(user));
  const ungelesen = meldungen?.pages[0]?.unread ?? 0;
  const { data: gespraeche } = useConversations(Boolean(user));
  const ungeleseneGespraeche = gespraeche?.unread ?? 0;


  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={{ padding: spacing.lg, paddingTop: insets.top + spacing.md, gap: spacing.lg, paddingBottom: spacing.xxl }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Logo />
      </View>

      {!ready ? (
        <ActivityIndicator color={theme.primary} />
      ) : user ? (
        <>
          <View>
            <Txt variant="h1">{t('dashboard.greeting', { name: user.name ?? user.email ?? '' })}</Txt>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
              <Chip label={t(`dashboard.roles.${user.role}`)} tone="primary" />
              {user.dealer?.verified ? <Chip label={t('vehicleDetail.trust.verifiedDealer')} tone="success" /> : null}
            </View>
          </View>

          <Card style={{ padding: spacing.lg, gap: 4 }}>
            <Txt variant="caption" color={theme.muted}>{t('dashboard.email').toUpperCase()}</Txt>
            <Txt>{user.email}</Txt>
            <Txt variant="caption" color={theme.muted} style={{ marginTop: 8 }}>{t('dashboard.memberSince').toUpperCase()}</Txt>
            <Txt>{new Date(user.createdAt).toLocaleDateString(locale === 'sq' ? 'sq-AL' : locale, { dateStyle: 'long' })}</Txt>
          </Card>

          <View style={{ gap: spacing.sm }}>
            <Button label={t('myListings.create')} onPress={() => router.push('/listings/new')} />
            <Button label={t('dashboard.myListings')} variant="outline" onPress={() => router.push('/listings')} />
            <Button label={ungelesen ? `${t('notifications.title')} · ${ungelesen}` : t('notifications.title')} variant="outline" onPress={() => router.push('/notifications')} />
            <Button label={t('account.profileTitle')} variant="outline" onPress={() => router.push('/profile')} />
            <Button label={ungeleseneGespraeche ? `${t('nav.messages')} · ${ungeleseneGespraeche}` : t('nav.messages')} variant="outline" onPress={() => router.push('/messages')} />
            <Button label={t('searches.title')} variant="outline" onPress={() => router.push('/searches')} />
          </View>
        </>
      ) : (
        <Card style={{ padding: spacing.lg, gap: spacing.md }}>
          <Txt variant="h1">{t('auth.loginTitle')}</Txt>
          <Txt color={theme.muted}>{t('auth.loginSubtitle')}</Txt>
          <Button label={t('nav.login')} onPress={() => router.push('/login')} />
          <Button label={t('nav.register')} variant="outline" onPress={() => router.push('/register')} />
        </Card>
      )}

      <View style={{ gap: spacing.sm }}>
        <Txt variant="h2">{t('settings.language')}</Txt>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {locales.map((l) => (
            <Chip key={l} label={t(`locales.${l}`)} active={locale === l} onPress={() => setLocale(l as Locale)} />
          ))}
        </View>
      </View>

      {user ? <Button label={t('dashboard.logout')} variant="ghost" onPress={() => logout()} /> : null}

      <Txt variant="small" color={theme.muted} style={{ textAlign: 'center' }}>
        LEVIZ · {t('brand.tagline')}
      </Txt>
    </ScrollView>
  );
}
