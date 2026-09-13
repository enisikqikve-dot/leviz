import { Link, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Logo } from '~/components/logo';
import { Button, Txt } from '~/components/ui';
import { VehicleCard } from '~/components/vehicle-card';
import { useI18n } from '~/lib/i18n';
import { useHome } from '~/lib/queries';
import { fonts, radius, spacing, useTheme } from '~/lib/theme';

/**
 * Die Startseite: Marke, ein Weg in die Suche, dann Fahrzeuge.
 *
 * Bewusst kurz. Auf dem Telefon ist die Suche der eigentliche Bildschirm --
 * die Startseite muss nur zeigen, dass hier Autos sind, und einen Tipp
 * entfernt sein.
 */
export default function HomeScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, isLoading, isError, refetch } = useHome();

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
      <View style={[styles.hero, { backgroundColor: theme.ink, paddingTop: insets.top + spacing.lg }]}>
        <View style={styles.logo}><Logo dark /></View>

        <Txt variant="caption" color={theme.primary === '#2F5BFF' ? '#6D8DFF' : theme.primary} style={{ marginTop: spacing.xl }}>
          {t('brand.tagline').toUpperCase()}
        </Txt>
        <Txt variant="title" color={theme.inkForeground} style={{ marginTop: 6 }}>{t('home.hero.title')}</Txt>
        <Txt variant="body" color="#B7BDCB" style={{ marginTop: 8 }}>{t('home.hero.subtitle')}</Txt>

        <Pressable
          onPress={() => router.push('/search')}
          style={[styles.suchfeld, { backgroundColor: theme.card, borderColor: theme.border }]}
          accessibilityRole="search"
        >
          <Txt color={theme.muted}>⌕  {t('home.hero.make')} · {t('home.hero.model')} · {t('home.hero.priceMax')}</Txt>
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: spacing.xxl }} color={theme.primary} />
      ) : isError || !data ? (
        <View style={{ padding: spacing.lg, gap: spacing.md }}>
          <Txt color={theme.muted}>{t('common.error')}</Txt>
          <Button label={t('common.retry')} variant="outline" onPress={() => refetch()} />
        </View>
      ) : (
        <>
          {data.featured.length > 0 ? (
            <Abschnitt title={t('vehicles.badges.featured')}>
              {data.featured.map((v) => <VehicleCard key={v.id} vehicle={v} />)}
            </Abschnitt>
          ) : null}

          <Abschnitt
            title={t('search.title')}
            aside={
              <Link href="/search" asChild>
                <Pressable><Txt variant="small" color={theme.primary} style={{ fontFamily: fonts.medium }}>{t('search.resultsMany', { count: data.total })} →</Txt></Pressable>
              </Link>
            }
          >
            {data.latest.slice(0, 8).map((v) => <VehicleCard key={v.id} vehicle={v} />)}
          </Abschnitt>
        </>
      )}
    </ScrollView>
  );
}

function Abschnitt({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.xl, gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <Txt variant="h1">{title}</Txt>
        {aside}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  logo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  suchfeld: { marginTop: spacing.xl, height: 50, borderRadius: radius.md, borderWidth: 1, justifyContent: 'center', paddingHorizontal: 14 },
});
