import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';

import { Button, Empty, Txt } from '~/components/ui';
import { ApiError } from '~/lib/api';
import { useAuth } from '~/lib/auth';
import { useI18n } from '~/lib/i18n';
import { useStartConversation } from '~/lib/queries';
import { fonts, radius, spacing, useTheme } from '~/lib/theme';

/**
 * Die erste Nachricht an einen Verkaeufer -- dieselbe Funktion und dieselbe
 * Ratenbegrenzung wie das Formular auf der Website. Danach geht es direkt in
 * den Faden; gibt es zum Fahrzeug schon einen, landet die Nachricht dort.
 */
export default function NewConversationScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { vehicleId, title } = useLocalSearchParams<{ vehicleId: string; title?: string }>();
  const { user, ready } = useAuth();
  const starten = useStartConversation();
  const [text, setText] = useState('');
  const [fehler, setFehler] = useState<string | null>(null);

  if (ready && !user) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: spacing.lg, backgroundColor: theme.background }}>
        <Empty title={t('listing.loginRequired')} action={<Button label={t('nav.login')} onPress={() => router.push('/login')} />} />
      </View>
    );
  }

  const abschicken = async () => {
    setFehler(null);
    try {
      const { conversationId } = await starten.mutateAsync({ vehicleId, body: text.trim() });
      router.replace(`/messages/${conversationId}`);
    } catch (e) {
      if (e instanceof ApiError && e.fields?.length) setFehler(e.fields[0].message);
      else if (e instanceof ApiError && e.status === 400) setFehler(e.message);
      else if (e instanceof ApiError && e.status === 429) setFehler(t('auth.errorTooMany'));
      else setFehler(t('auth.genericError'));
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }} keyboardShouldPersistTaps="handled">
        <View>
          <Txt variant="h1">{t('inquiry.title')}</Txt>
          {title ? <Txt color={theme.muted} style={{ marginTop: 4 }}>{title}</Txt> : null}
        </View>
        <TextInput
          autoFocus
          multiline
          textAlignVertical="top"
          value={text}
          onChangeText={setText}
          placeholder={t('inquiry.messagePlaceholder')}
          placeholderTextColor={theme.muted}
          maxLength={4000}
          style={{
            minHeight: 160, borderRadius: radius.md, borderWidth: 1, padding: 14,
            fontFamily: fonts.regular, fontSize: 15, lineHeight: 21,
            backgroundColor: theme.card, borderColor: fehler ? theme.destructive : theme.border, color: theme.foreground,
          }}
        />
        {fehler ? <Txt variant="small" color={theme.destructive}>{fehler}</Txt> : null}
        <Button label={t('messages.send')} onPress={abschicken} loading={starten.isPending} disabled={text.trim().length < 10} />
        <Txt variant="small" color={theme.muted}>{t('inquiry.subtitle')}</Txt>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
