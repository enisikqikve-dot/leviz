import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, View } from 'react-native';

import { Logo } from '~/components/logo';
import { Button, Chip, Input, Txt } from '~/components/ui';
import { API_URL, ApiError } from '~/lib/api';
import { useAuth } from '~/lib/auth';
import { useI18n } from '~/lib/i18n';
import { fonts, spacing, useTheme } from '~/lib/theme';

/**
 * Registrierung -- Privat oder Autosallon, wie auf der Website.
 *
 * Die Pruefung der Felder macht der Server mit demselben Schema wie das
 * Formular auf levizz.com; hier werden nur offensichtliche Luecken vorher
 * abgefangen, damit kein Aufruf ins Leere geht. Fehler je Feld kommen aus
 * der Antwort zurueck und landen unter dem Feld.
 */
export default function RegisterScreen() {
  const theme = useTheme();
  const { t, locale } = useI18n();
  const router = useRouter();
  const { register } = useAuth();

  const [typ, setTyp] = useState<'PRIVATE' | 'DEALER'>('PRIVATE');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [firma, setFirma] = useState('');
  const [nummer, setNummer] = useState('');
  const [zugestimmt, setZugestimmt] = useState(false);
  const [feldFehler, setFeldFehler] = useState<Record<string, string>>({});
  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);

  const haendler = typ === 'DEALER';
  const vollstaendig =
    name.trim().length >= 2 && email.includes('@') && password.length >= 8 && confirm === password && zugestimmt &&
    (!haendler || firma.trim().length > 0);

  const absenden = async () => {
    setFehler(null);
    setFeldFehler({});
    setLaeuft(true);
    try {
      await register({
        accountType: typ,
        name: name.trim(),
        email: email.trim(),
        password,
        confirmPassword: confirm,
        acceptTerms: true,
        companyName: haendler ? firma.trim() : undefined,
        registrationNumber: haendler ? nummer.trim() || undefined : undefined,
        locale,
      });
      // Als Fenster geoeffnet: schliessen. Direkt aufgerufen (Deep Link): zur Startseite.
      if (router.canDismiss()) router.dismiss();
      else router.replace('/');
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) setFehler(t('auth.errorAccountExists'));
      else if (e instanceof ApiError && e.status === 429) setFehler(t('auth.errorTooMany'));
      else if (e instanceof ApiError && e.fields) {
        setFeldFehler(Object.fromEntries(e.fields.map((f) => [f.path, f.message])));
      } else setFehler(t('auth.genericError'));
    } finally {
      setLaeuft(false);
    }
  };

  const kushtet = `${API_URL}${{ sq: '/kushtet', de: '/de/agb', en: '/en/terms' }[locale]}`;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: spacing.md }}>
          <Logo />
        </View>

        <View>
          <Txt variant="h1">{t('auth.registerTitle')}</Txt>
          <Txt color={theme.muted} style={{ marginTop: 4 }}>{t('auth.registerSubtitle')}</Txt>
        </View>

        <View style={{ gap: 8 }}>
          <Txt variant="small" style={{ fontFamily: fonts.medium }}>{t('auth.accountType')}</Txt>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <Chip label={t('auth.accountPrivate')} active={!haendler} onPress={() => setTyp('PRIVATE')} />
            <Chip label={t('auth.accountDealer')} active={haendler} onPress={() => setTyp('DEALER')} />
          </View>
          <Txt variant="small" color={theme.muted}>{t(haendler ? 'auth.accountDealerHint' : 'auth.accountPrivateHint')}</Txt>
        </View>

        {haendler ? (
          <>
            <Input label={t('auth.companyName')} value={firma} onChangeText={setFirma} error={feldFehler.companyName} />
            <Input label={t('auth.registrationNumber')} value={nummer} onChangeText={setNummer} keyboardType="number-pad" error={feldFehler.registrationNumber} />
          </>
        ) : null}

        <Input label={t(haendler ? 'auth.contactName' : 'auth.name')} value={name} onChangeText={setName} autoComplete="name" error={feldFehler.name} />
        <Input label={t('auth.email')} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" error={feldFehler.email} />
        <Input label={t('auth.password')} value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" error={feldFehler.password} />
        <Input label={t('auth.confirmPassword')} value={confirm} onChangeText={setConfirm} secureTextEntry error={feldFehler.confirmPassword} />

        <Pressable onPress={() => setZugestimmt((v) => !v)} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
          <View style={{ width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: zugestimmt ? theme.primary : theme.border, backgroundColor: zugestimmt ? theme.primary : 'transparent', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
            {zugestimmt ? <Txt variant="caption" color={theme.primaryForeground}>✓</Txt> : null}
          </View>
          <View style={{ flex: 1 }}>
            <Txt variant="small">{t('auth.acceptTerms')}</Txt>
            <Pressable onPress={() => Linking.openURL(kushtet)}>
              <Txt variant="small" color={theme.primary}>{t('footer.terms')}</Txt>
            </Pressable>
          </View>
        </Pressable>

        {fehler ? <Txt variant="small" color={theme.destructive}>{fehler}</Txt> : null}

        <Button label={t(haendler ? 'auth.submitRegisterDealer' : 'auth.submitRegister')} onPress={absenden} loading={laeuft} disabled={!vollstaendig} />

        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
          <Txt variant="small" color={theme.muted}>{t('auth.hasAccount')}</Txt>
          <Link href="/login" replace>
            <Txt variant="small" color={theme.primary}>{t('nav.login')}</Txt>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
