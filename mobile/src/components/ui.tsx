import { type ReactNode } from 'react';
import {
  ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View,
  type PressableProps, type TextInputProps, type TextProps, type ViewProps,
} from 'react-native';

import { fonts, radius, spacing, useTheme } from '~/lib/theme';

/**
 * Die wenigen Bausteine, aus denen jeder Bildschirm besteht.
 *
 * Keine Bibliothek: fuenf Teile mit den Markenfarben reichen, und sie sehen
 * auf beiden Plattformen gleich aus.
 */

export function Txt({
  variant = 'body', color, style, ...props
}: TextProps & { variant?: 'title' | 'h1' | 'h2' | 'body' | 'small' | 'caption'; color?: string }) {
  const theme = useTheme();
  const stil = {
    title: { fontFamily: fonts.bold, fontSize: 30, lineHeight: 36, letterSpacing: -0.5 },
    h1: { fontFamily: fonts.bold, fontSize: 24, lineHeight: 30, letterSpacing: -0.3 },
    h2: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22 },
    body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21 },
    small: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
    caption: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 14, letterSpacing: 0.4 },
  }[variant];
  return <Text {...props} style={[stil, { color: color ?? theme.foreground }, style]} />;
}

export function Button({
  label, variant = 'primary', loading, disabled, style, ...props
}: PressableProps & { label: string; variant?: 'primary' | 'outline' | 'ghost'; loading?: boolean }) {
  const theme = useTheme();
  const aus = disabled || loading;
  const hintergrund = variant === 'primary' ? theme.primary : variant === 'outline' ? theme.card : 'transparent';
  const farbe = variant === 'primary' ? theme.primaryForeground : theme.foreground;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={aus}
      {...props}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: hintergrund,
          borderColor: variant === 'outline' ? theme.border : hintergrund,
          opacity: aus ? 0.55 : pressed ? 0.85 : 1,
        },
        style as object,
      ]}
    >
      {loading ? <ActivityIndicator color={farbe} /> : null}
      <Text style={[styles.buttonLabel, { color: farbe }]}>{label}</Text>
    </Pressable>
  );
}

export function Input({ label, error, style, ...props }: TextInputProps & { label?: string; error?: string }) {
  const theme = useTheme();
  return (
    <View style={{ gap: 6 }}>
      {label ? <Txt variant="small" style={{ fontFamily: fonts.medium }}>{label}</Txt> : null}
      <TextInput
        placeholderTextColor={theme.muted}
        {...props}
        style={[
          styles.input,
          { backgroundColor: theme.card, borderColor: error ? theme.destructive : theme.border, color: theme.foreground },
          style,
        ]}
      />
      {error ? <Txt variant="small" color={theme.destructive}>{error}</Txt> : null}
    </View>
  );
}

export function Card({ style, ...props }: ViewProps) {
  const theme = useTheme();
  return <View {...props} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }, style]} />;
}

export function Chip({
  label, active, onPress, tone = 'muted',
}: { label: string; active?: boolean; onPress?: () => void; tone?: 'muted' | 'success' | 'warning' | 'primary' }) {
  const theme = useTheme();
  const farben = {
    muted: [theme.mutedSurface, theme.muted],
    success: [theme.successSoft, theme.success],
    warning: [theme.warningSoft, theme.warning],
    primary: [theme.primarySoft, theme.primary],
  }[active ? 'primary' : tone];

  return (
    <Pressable onPress={onPress} disabled={!onPress} style={[styles.chip, { backgroundColor: farben[0] }]}>
      <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: farben[1] }}>{label}</Text>
    </Pressable>
  );
}

export function Empty({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={[styles.empty, { borderColor: theme.border }]}>
      <Txt variant="h2" style={{ textAlign: 'center' }}>{title}</Txt>
      {hint ? <Txt variant="small" color={theme.muted} style={{ textAlign: 'center' }}>{hint}</Txt> : null}
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 48, borderRadius: radius.md, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: spacing.lg,
  },
  buttonLabel: { fontFamily: fonts.semibold, fontSize: 15 },
  input: { height: 48, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: 14, fontFamily: fonts.regular, fontSize: 15 },
  card: { borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.sm },
  empty: { alignItems: 'center', gap: 10, padding: spacing.xxl, borderRadius: radius.lg, borderWidth: 1, borderStyle: 'dashed' },
});
