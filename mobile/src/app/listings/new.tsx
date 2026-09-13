import { useRouter } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { ListingWizard } from '~/components/listing-wizard';
import { Button, Empty } from '~/components/ui';
import { useAuth } from '~/lib/auth';
import { useI18n } from '~/lib/i18n';
import { spacing, useTheme } from '~/lib/theme';

/** Ein neues Inserat -- der Assistent mit leeren Feldern. */
export default function NewListingScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { user, ready } = useAuth();

  if (!ready) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={theme.primary} /></View>;
  }

  if (!user) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: spacing.lg, backgroundColor: theme.background }}>
        <Empty title={t('listing.loginRequired')} action={<Button label={t('nav.login')} onPress={() => router.push('/login')} />} />
      </View>
    );
  }

  return <ListingWizard />;
}
