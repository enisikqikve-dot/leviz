import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { Logo } from '~/components/logo';
import { Button, Input, Txt } from '~/components/ui';
import { ApiError } from '~/lib/api';
import { useAuth } from '~/lib/auth';
import { useI18n } from '~/lib/i18n';
import { spacing, useTheme } from '~/lib/theme';

/**
 * Anmeldung -- dieselbe Pruefung wie auf der Website, ueber die API.
 *
 * Die Meldung bei falschen Daten ist bewusst dieselbe fuer "Adresse unbekannt"
 * und "Passwort falsch": sonst liesse sich hier herausfinden, wer ein Konto
 * hat.
 */
export default function LoginScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);

  const absenden = async () => {
    setFehler(null);
    setLaeuft(true);
    try {
      await login(email.trim(), password);
      // Als Fenster geoeffnet: schliessen. Direkt aufgerufen (Deep Link): zur Startseite.
      if (router.canDismiss()) router.dismiss();
      else router.replace('/');
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setFehler(t('auth.invalidCredentials'));
      else if (e instanceof ApiError && e.status === 429) setFehler(t('auth.errorTooMany'));
      else setFehler(t('auth.genericError'));
    } finally {
      setLaeuft(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: spacing.md }}>
          <Logo />
        </View>

        <View>
          <Txt variant="h1">{t('auth.loginTitle')}</Txt>
          <Txt color={theme.muted} style={{ marginTop: 4 }}>{t('auth.loginSubtitle')}</Txt>
        </View>

        <Input
          label={t('auth.email')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
        />
        <Input
          label={t('auth.password')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
          textContentType="password"
          onSubmitEditing={absenden}
          error={fehler ?? undefined}
        />

        <Button label={t('auth.submitLogin')} onPress={absenden} loading={laeuft} disabled={!email || !password} />

        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
          <Txt variant="small" color={theme.muted}>{t('auth.noAccount')}</Txt>
          <Link href="/register" replace>
            <Txt variant="small" color={theme.primary}>{t('nav.register')}</Txt>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
