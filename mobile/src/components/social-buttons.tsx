import * as AppleAuthentication from 'expo-apple-authentication';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Txt } from '~/components/ui';
import { ApiError } from '~/lib/api';
import { useAuth } from '~/lib/auth';
import { useI18n } from '~/lib/i18n';
import {
  appleAvailable, googleAvailable, SocialCancelled, signInWithApple, signInWithGoogle,
  type SocialCredential, type SocialProvider,
} from '~/lib/social';
import { fonts, radius, spacing, useTheme } from '~/lib/theme';

/**
 * "Vazhdo me Google" und "Vazhdo me Apple" -- fuer Anmelde- und
 * Registrierbildschirm, wie auf der Website.
 *
 * Es erscheint nur, was auf diesem Telefon geht: Google, wenn die
 * Client-IDs gebaut sind; Apple nur auf iOS. Auf iOS muss Apple dabei sein,
 * sobald Google angeboten wird -- das verlangt der App Store.
 *
 * Der Apple-Knopf ist der von Apple selbst (Vorgabe im Store, und er sieht
 * auf jedem iPhone gleich aus). Der Google-Knopf ist unserer, mit Googles
 * vier Farben -- deren Vorgabe fuer den Knopf.
 */
export function SocialButtons({
  mode,
  onDone,
}: {
  mode: 'login' | 'register';
  onDone: () => void;
}) {
  const theme = useTheme();
  const { t, locale } = useI18n();
  const { loginWithSocial } = useAuth();
  const dunkel = theme.scheme === 'dark';

  const [apple, setApple] = useState(false);
  const [laeuft, setLaeuft] = useState<SocialProvider | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const google = googleAvailable();

  useEffect(() => {
    let aktiv = true;
    void appleAvailable().then((ja) => aktiv && setApple(ja));
    return () => {
      aktiv = false;
    };
  }, []);

  if (!google && !apple) return null;

  const anmelden = async (provider: SocialProvider, holen: () => Promise<SocialCredential>) => {
    setFehler(null);
    setLaeuft(provider);
    try {
      const credential = await holen();
      await loginWithSocial(credential, locale);
      onDone();
    } catch (e) {
      if (e instanceof SocialCancelled) return;
      if (e instanceof ApiError && e.status === 409) setFehler(t('auth.errorAccountExists'));
      else if (e instanceof ApiError && e.status === 403) setFehler(t('auth.errorAccessDenied'));
      else if (e instanceof ApiError && e.status === 429) setFehler(t('auth.errorTooMany'));
      else setFehler(t('auth.errorGeneric'));
    } finally {
      setLaeuft(null);
    }
  };

  const trenner = (text: string) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: theme.border }} />
      <Txt variant="caption" color={theme.muted}>{text}</Txt>
      <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: theme.border }} />
    </View>
  );

  return (
    <View style={{ gap: spacing.md }}>
      {mode === 'login' ? trenner(t('auth.orContinue')) : null}

      <View style={{ gap: spacing.sm }}>
        {google ? (
          <Pressable
            accessibilityRole="button"
            disabled={laeuft !== null}
            onPress={() => anmelden('google', signInWithGoogle)}
            style={({ pressed }) => [
              styles.knopf,
              { backgroundColor: theme.card, borderColor: theme.border, opacity: laeuft ? 0.6 : pressed ? 0.85 : 1 },
            ]}
          >
            {laeuft === 'google' ? <ActivityIndicator color={theme.foreground} /> : <GoogleG />}
            <Text style={[styles.beschriftung, { color: theme.foreground }]}>{t('auth.google')}</Text>
          </Pressable>
        ) : null}

        {apple ? (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={
              mode === 'register'
                ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP
                : AppleAuthentication.AppleAuthenticationButtonType.CONTINUE
            }
            buttonStyle={
              dunkel
                ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
            }
            cornerRadius={radius.md}
            style={{ height: 48 }}
            onPress={() => void anmelden('apple', signInWithApple)}
          />
        ) : null}
      </View>

      {fehler ? <Txt variant="small" color={theme.destructive}>{fehler}</Txt> : null}

      {mode === 'register' ? (
        <>
          <Txt variant="caption" color={theme.muted}>{t('auth.socialTermsPlain')}</Txt>
          {trenner(t('auth.orEmail'))}
        </>
      ) : null}
    </View>
  );
}

/** Googles "G" in den vier Farben -- dieselben Pfade wie auf der Website. */
function GoogleG() {
  return (
    <Svg width={18} height={18} viewBox="0 0 48 48">
      <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  knopf: {
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  beschriftung: {
    fontFamily: fonts.medium,
    fontSize: 15,
  },
});
