import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { ChipSelect, Field, PickerField } from '~/components/form';
import { Button, Card, Empty, Input, Txt } from '~/components/ui';
import { ApiError } from '~/lib/api';
import { useAuth } from '~/lib/auth';
import { locales, useI18n, type Locale } from '~/lib/i18n';
import { useProfile, useUpdateProfile } from '~/lib/queries';
import { spacing, useTheme } from '~/lib/theme';
import type { Profile } from '~/lib/types';

/**
 * Das Profil: Name, Telefon, Wohnort, Sprache -- dieselben Felder und
 * dasselbe Schema wie die Einstellungen auf der Website. Feldfehler kommen
 * als Schluessel aus `account` zurueck und werden hier uebersetzt.
 */
export default function ProfileScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { user, ready } = useAuth();
  const { data, isPending } = useProfile(Boolean(user));

  if (!ready || (user && isPending)) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={theme.primary} /></View>;
  }

  if (!user || !data) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: spacing.lg, backgroundColor: theme.background }}>
        <Empty title={t('auth.loginTitle')} action={<Button label={t('nav.login')} onPress={() => router.push('/login')} />} />
      </View>
    );
  }

  return <ProfilFormular profil={data} />;
}

function ProfilFormular({ profil }: { profil: Profile }) {
  const theme = useTheme();
  const { t, setLocale } = useI18n();
  const speichern = useUpdateProfile();

  const [name, setName] = useState(profil.name);
  const [phone, setPhone] = useState(profil.phone ?? '');
  const [citySlug, setCitySlug] = useState<string | undefined>(profil.citySlug ?? undefined);
  const [locale, setLocaleWert] = useState<Locale>(profil.locale);
  const [fehler, setFehler] = useState<Record<string, string>>({});
  const [meldung, setMeldung] = useState<{ text: string; ok: boolean } | null>(null);

  const uebersetze = (schluessel: string) =>
    t(`account.${schluessel}`) === `account.${schluessel}` ? schluessel : t(`account.${schluessel}`);

  const absenden = async () => {
    setFehler({});
    setMeldung(null);
    try {
      await speichern.mutateAsync({ name: name.trim(), phone: phone.trim() || null, citySlug, locale });
      // Die Sprache der App folgt der Sprache des Kontos.
      setLocale(locale);
      setMeldung({ text: t('account.saved'), ok: true });
    } catch (e) {
      if (e instanceof ApiError && e.fields?.length) {
        setFehler(Object.fromEntries(e.fields.map((f) => [f.path, uebersetze(f.message)])));
      } else setMeldung({ text: t('auth.genericError'), ok: false });
    }
  };

  const staedte = profil.cities.map((c) => ({ value: c.slug, label: c.name, group: c.countryCode }));

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl }} keyboardShouldPersistTaps="handled">
        <View>
          <Txt variant="h1">{t('account.profileTitle')}</Txt>
          <Txt color={theme.muted} style={{ marginTop: 4 }}>{t('account.profileDescription')}</Txt>
        </View>

        <Card style={{ padding: spacing.lg, gap: spacing.md }}>
          <Field label={t('account.name')} error={fehler.name}>
            <Input value={name} onChangeText={setName} autoComplete="name" invalid={Boolean(fehler.name)} />
          </Field>
          <Field label={t('account.phone')} hint={t('account.phoneHint')} error={fehler.phone}>
            <Input value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" placeholder="+383 4x xxx xxx" invalid={Boolean(fehler.phone)} />
          </Field>
          <Field label={t('account.email')} hint={t('account.emailHint')}>
            <Input value={profil.email ?? ''} editable={false} style={{ opacity: 0.6 }} />
          </Field>
          <PickerField label={t('account.city')} value={citySlug} options={staedte} placeholder={t('account.cityNone')} onChange={setCitySlug} />
          <ChipSelect
            label={t('account.language')}
            value={locale}
            options={locales.map((l) => ({ value: l, label: t(`account.languages.${l}`) }))}
            onChange={(v) => setLocaleWert((v ?? 'sq') as Locale)}
          />
          <Txt variant="small" color={theme.muted}>{t('account.languageHint')}</Txt>
        </Card>

        {meldung ? <Txt variant="small" color={meldung.ok ? theme.success : theme.destructive}>{meldung.text}</Txt> : null}

        <Button label={t('account.save')} onPress={absenden} loading={speichern.isPending} disabled={name.trim().length < 2} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
