import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatPrice } from '@/lib/currency';

import { Button, Empty, Txt } from '~/components/ui';
import { ApiError, imageUrl } from '~/lib/api';
import { useAuth } from '~/lib/auth';
import { useI18n } from '~/lib/i18n';
import { useConversation, useMarkConversationRead, useSendMessage, useToggleBlock } from '~/lib/queries';
import { fonts, radius, spacing, useTheme } from '~/lib/theme';
import type { Message } from '~/lib/types';

/**
 * Ein Gespraechsfaden: oben das Fahrzeug, in der Mitte die Nachrichten
 * (eigene rechts in Blau, fremde links), unten das Schreibfeld.
 *
 * Beim Oeffnen gilt der Faden als gelesen. Neue Nachrichten kommen alle
 * 15 Sekunden -- und per Push sofort, wenn die App zu ist.
 */
export default function ConversationScreen() {
  const theme = useTheme();
  const { t, locale } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, ready } = useAuth();
  const { data, isPending, isError } = useConversation(user ? id : undefined);
  const markiere = useMarkConversationRead();
  const senden = useSendMessage(id);
  const blockieren = useToggleBlock(id);
  const [text, setText] = useState('');
  const [fehler, setFehler] = useState<string | null>(null);
  const liste = useRef<FlatList<Message>>(null);

  // Einmal beim Oeffnen als gelesen markieren -- und noch einmal, wenn
  // waehrend des Lesens etwas Neues ankommt.
  const anzahl = data?.messages.length ?? 0;
  const { mutate: alsGelesen } = markiere;
  useEffect(() => {
    if (id && anzahl > 0) alsGelesen(id);
  }, [id, anzahl, alsGelesen]);

  if (!ready || (user && isPending && !isError)) {
    return <View style={styles.mitte}><ActivityIndicator color={theme.primary} /></View>;
  }
  if (!user) {
    return (
      <View style={[styles.mitte, { padding: spacing.lg }]}>
        <Empty title={t('auth.loginTitle')} action={<Button label={t('nav.login')} onPress={() => router.push('/login')} />} />
      </View>
    );
  }
  if (isError || !data) {
    return (
      <View style={[styles.mitte, { padding: spacing.lg }]}>
        <Empty title={t('common.notFoundTitle')} action={<Button label={t('common.back')} variant="outline" onPress={() => router.back()} />} />
      </View>
    );
  }

  const gesperrt = data.status === 'BLOCKED';

  const abschicken = async () => {
    const body = text.trim();
    if (!body) return;
    setFehler(null);
    try {
      await senden.mutateAsync(body);
      setText('');
      setTimeout(() => liste.current?.scrollToEnd({ animated: true }), 50);
    } catch (e) {
      setFehler(e instanceof ApiError && e.status === 400 ? e.message : t('auth.genericError'));
    }
  };

  const sperren = () => {
    const tun = () => blockieren.mutate();
    if (gesperrt || Platform.OS === 'web') return tun();
    Alert.alert(t('messages.block'), data.counterpartName, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('messages.block'), style: 'destructive', onPress: tun },
    ]);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90} style={{ flex: 1, backgroundColor: theme.background }}>
      <Pressable onPress={() => router.push(`/vehicle/${data.vehicle.slug}`)} style={[styles.kopf, { borderColor: theme.border, backgroundColor: theme.card }]}>
        <View style={[styles.bild, { backgroundColor: theme.mutedSurface }]}>
          {data.vehicle.image ? <Image source={{ uri: imageUrl(data.vehicle.image) }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
        </View>
        <View style={{ flex: 1 }}>
          <Txt variant="caption" color={theme.muted}>{t('messages.aboutVehicle').toUpperCase()} · {data.counterpartName}</Txt>
          <Txt style={{ fontFamily: fonts.semibold }} numberOfLines={1}>{data.vehicle.title}</Txt>
          <Txt variant="small" color={theme.muted}>
            {formatPrice(data.vehicle.priceCents, { locale })}{data.vehicle.status === 'SOLD' ? ` · ${t('messages.sold')}` : ''}
          </Txt>
        </View>
        <Pressable onPress={sperren} hitSlop={8} disabled={gesperrt && !data.blockedByMe}>
          <Txt variant="caption" color={gesperrt && !data.blockedByMe ? theme.muted : theme.destructive}>
            {gesperrt ? (data.blockedByMe ? t('messages.unblock') : t('messages.blocked')) : t('messages.block')}
          </Txt>
        </Pressable>
      </Pressable>

      <FlatList
        ref={liste}
        data={data.messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: spacing.md, gap: 6, flexGrow: 1, justifyContent: 'flex-end' }}
        onContentSizeChange={() => liste.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) => (
          <View style={{ alignItems: item.mine ? 'flex-end' : 'flex-start' }}>
            <View style={[styles.blase, { backgroundColor: item.mine ? theme.primary : theme.card, borderColor: item.mine ? theme.primary : theme.border }]}>
              <Txt color={item.mine ? theme.primaryForeground : theme.foreground}>{item.body}</Txt>
              <Txt variant="caption" color={item.mine ? 'rgba(255,255,255,0.75)' : theme.muted} style={{ marginTop: 4, textAlign: 'right' }}>
                {new Date(item.createdAt).toLocaleString(locale === 'sq' ? 'sq-AL' : locale, { dateStyle: 'short', timeStyle: 'short' })}
              </Txt>
            </View>
          </View>
        )}
      />

      {gesperrt ? (
        <View style={[styles.fuss, { borderColor: theme.border, paddingBottom: insets.bottom + spacing.sm }]}>
          <Txt variant="small" color={theme.muted} style={{ textAlign: 'center' }}>{t('messages.blocked')}</Txt>
        </View>
      ) : (
        <View style={[styles.fuss, { borderColor: theme.border, paddingBottom: insets.bottom + spacing.sm }]}>
          {fehler ? <Txt variant="small" color={theme.destructive}>{fehler}</Txt> : null}
          <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-end' }}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={t('messages.placeholder')}
              placeholderTextColor={theme.muted}
              multiline
              maxLength={4000}
              style={[styles.eingabe, { backgroundColor: theme.card, borderColor: theme.border, color: theme.foreground }]}
            />
            <Button label={t('messages.send')} onPress={abschicken} loading={senden.isPending} disabled={!text.trim()} style={{ height: 44, paddingHorizontal: 16 }} />
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  mitte: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  kopf: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderBottomWidth: 1 },
  bild: { width: 56, height: 44, borderRadius: radius.sm, overflow: 'hidden' },
  blase: { maxWidth: '82%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.md, borderWidth: 1 },
  fuss: { borderTopWidth: 1, padding: spacing.md, gap: 6 },
  eingabe: { flex: 1, minHeight: 44, maxHeight: 120, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontFamily: fonts.regular, fontSize: 15 },
});
