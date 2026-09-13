import { Redirect, usePathname, useRouter } from 'expo-router';
import { Linking, View } from 'react-native';

import { Button, Empty } from '~/components/ui';
import { useI18n } from '~/lib/i18n';
import { targetFor } from '~/lib/links';
import { spacing, useTheme } from '~/lib/theme';

/**
 * Der Auffangbildschirm -- und damit der Eingang fuer Links von der Website.
 *
 * Ein Universal Link kommt mit dem Pfad der Website an: /vetura/bmw-320d,
 * /de/fahrzeug/..., /paneli/shpalljet. Keiner davon ist eine Route der App,
 * also landet er hier. `targetFor` uebersetzt ihn mit derselben Tabelle, die
 * die Website benutzt, und leitet weiter. Was die App nicht hat, bekommt
 * einen Knopf zur Website -- kein toter Bildschirm.
 */
export default function NotFoundScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();

  const ziel = targetFor(pathname);
  if ('href' in ziel && ziel.href !== pathname) return <Redirect href={ziel.href} />;

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: spacing.lg, backgroundColor: theme.background, gap: spacing.md }}>
      <Empty
        title={t('notifications.notFoundTitle')}
        hint={t('notifications.notFoundHint')}
        action={
          <View style={{ gap: spacing.sm, alignSelf: 'stretch' }}>
            {'web' in ziel ? <Button label={t('notifications.openOnWeb')} onPress={() => Linking.openURL(ziel.web)} /> : null}
            <Button label={t('common.back')} variant="outline" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
          </View>
        }
      />
    </View>
  );
}
