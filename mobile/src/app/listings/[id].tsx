import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { ListingWizard } from '~/components/listing-wizard';
import { Button, Empty } from '~/components/ui';
import { useAuth } from '~/lib/auth';
import { useI18n } from '~/lib/i18n';
import { useListing } from '~/lib/queries';
import { spacing, useTheme } from '~/lib/theme';

/**
 * Ein eigenes Inserat bearbeiten -- der Assistent, vorbelegt mit dem, was
 * die API zurueckgibt. Die Rueckuebersetzung vom Datensatz in die Felder
 * macht der Server; sie ist dieselbe wie fuer die Bearbeiten-Seite der
 * Website.
 */
export default function EditListingScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, ready } = useAuth();
  const { data, isPending, isError } = useListing(user ? id : undefined);

  if (!ready || (user && isPending && !isError)) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={theme.primary} /></View>;
  }

  if (!user) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: spacing.lg, backgroundColor: theme.background }}>
        <Empty title={t('listing.loginRequired')} action={<Button label={t('nav.login')} onPress={() => router.push('/login')} />} />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: spacing.lg, backgroundColor: theme.background }}>
        <Empty title={t('common.notFoundTitle')} hint={t('common.notFoundHint')} action={<Button label={t('common.back')} variant="outline" onPress={() => router.back()} />} />
      </View>
    );
  }

  // Der Schluessel erzwingt einen frischen Assistenten je Inserat: der
  // Zustand wird nur beim ersten Rendern aus `initial` uebernommen.
  return <ListingWizard key={data.id} initial={data.values} vehicleId={data.id} status={data.status} />;
}
