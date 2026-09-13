import { useMemo, useState, type ReactNode } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Chip, Input, Txt } from '~/components/ui';
import { useI18n } from '~/lib/i18n';
import { fonts, radius, spacing, useTheme } from '~/lib/theme';

/**
 * Die Formularteile des Inserat-Assistenten und des Profils.
 *
 * Alles, was mehr ist als ein Textfeld: eine Auswahl aus einer langen Liste
 * (Marke, Stadt) mit Suche, eine Auswahl aus wenigen Werten als Chips
 * (Kraftstoff, Zoll), ein Schalter, ein Zahlenfeld. Keine Bibliothek -- die
 * Teile sollen auf beiden Plattformen gleich aussehen und in Dunkel wie Hell
 * die Markenfarben tragen.
 */

/** Beschriftung oben, Fehler unten, dazwischen das Feld. */
export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Txt variant="small" style={{ fontFamily: fonts.medium }}>{label}</Txt>
      {children}
      {error ? <Txt variant="small" color={theme.destructive}>{error}</Txt>
        : hint ? <Txt variant="small" color={theme.muted}>{hint}</Txt> : null}
    </View>
  );
}

export type Option = { value: string; label: string; group?: string };

/**
 * Auswahl aus einer langen Liste: ein Knopf, der den aktuellen Wert zeigt,
 * und ein Fenster mit Suchfeld darueber. Fuer sechzig Marken oder vierzig
 * Staedte sind Chips zu viel und ein natives Dropdown zu klein.
 */
export function PickerField({
  label, value, options, placeholder, error, onChange, disabled,
}: {
  label: string;
  value: string | undefined;
  options: Option[];
  placeholder: string;
  error?: string;
  disabled?: boolean;
  onChange: (value: string | undefined) => void;
}) {
  const theme = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [offen, setOffen] = useState(false);
  const [suche, setSuche] = useState('');

  const aktuell = options.find((o) => o.value === value);
  const gefiltert = useMemo(() => {
    const q = suche.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, suche]);

  return (
    <Field label={label} error={error}>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={() => { setSuche(''); setOffen(true); }}
        style={[styles.picker, { backgroundColor: theme.card, borderColor: error ? theme.destructive : theme.border, opacity: disabled ? 0.55 : 1 }]}
      >
        <Txt color={aktuell ? theme.foreground : theme.muted} numberOfLines={1} style={{ flex: 1 }}>
          {aktuell?.label ?? placeholder}
        </Txt>
        <Txt color={theme.muted}>▾</Txt>
      </Pressable>

      <Modal visible={offen} animationType="slide" onRequestClose={() => setOffen(false)}>
        <View style={{ flex: 1, backgroundColor: theme.background, paddingTop: insets.top }}>
          <View style={{ padding: spacing.lg, gap: spacing.md }}>
            <Txt variant="h2">{label}</Txt>
            <TextInput
              autoFocus
              value={suche}
              onChangeText={setSuche}
              placeholder={t('search.placeholder')}
              placeholderTextColor={theme.muted}
              style={[styles.suche, { backgroundColor: theme.card, borderColor: theme.border, color: theme.foreground }]}
            />
          </View>
          <FlatList
            data={gefiltert}
            keyExtractor={(o) => o.value}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => { onChange(item.value); setOffen(false); }}
                style={({ pressed }) => [styles.zeile, { borderColor: theme.border, backgroundColor: pressed ? theme.mutedSurface : 'transparent' }]}
              >
                <Txt style={{ fontFamily: item.value === value ? fonts.semibold : fonts.regular }}>{item.label}</Txt>
                {item.group ? <Txt variant="small" color={theme.muted}>{item.group}</Txt> : null}
                {item.value === value ? <Txt color={theme.primary}>✓</Txt> : null}
              </Pressable>
            )}
            ListEmptyComponent={<Txt color={theme.muted} style={{ padding: spacing.lg }}>{t('search.noResults')}</Txt>}
          />
          <View style={{ position: 'absolute', left: spacing.lg, right: spacing.lg, bottom: insets.bottom + spacing.md }}>
            <Button label={t('common.close')} variant="outline" onPress={() => setOffen(false)} />
          </View>
        </View>
      </Modal>
    </Field>
  );
}

/** Wenige Werte als Chips -- einer davon, oder keiner. */
export function ChipSelect({
  label, value, options, error, onChange, allowNone,
}: {
  label: string;
  value: string | undefined;
  options: Option[];
  error?: string;
  allowNone?: boolean;
  onChange: (value: string | undefined) => void;
}) {
  return (
    <Field label={label} error={error}>
      <View style={styles.chips}>
        {options.map((o) => (
          <Chip
            key={o.value}
            label={o.label}
            active={value === o.value}
            onPress={() => onChange(allowNone && value === o.value ? undefined : o.value)}
          />
        ))}
      </View>
    </Field>
  );
}

/** Mehrere Werte als Chips (Ausstattung). */
export function MultiChipSelect({ values, options, onChange }: { values: string[]; options: Option[]; onChange: (values: string[]) => void }) {
  const schalte = (v: string) => onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v]);
  return (
    <View style={styles.chips}>
      {options.map((o) => <Chip key={o.value} label={o.label} active={values.includes(o.value)} onPress={() => schalte(o.value)} />)}
    </View>
  );
}

export function Toggle({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (value: boolean) => void }) {
  const theme = useTheme();
  return (
    <Pressable onPress={() => onChange(!value)} style={[styles.toggle, { borderColor: theme.border, backgroundColor: theme.card }]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt>{label}</Txt>
        {hint ? <Txt variant="small" color={theme.muted}>{hint}</Txt> : null}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: theme.primary, false: theme.border }} thumbColor="#FFFFFF" />
    </Pressable>
  );
}

/**
 * Zahlenfeld. Im Zustand liegt eine Zahl oder nichts -- nie ein leerer Text,
 * denn den wuerde das Schema zu 0 machen, und "0 km" ist eine Angabe.
 */
export function NumberField({
  label, value, onChange, error, hint, decimal, ...rest
}: {
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  error?: string;
  hint?: string;
  decimal?: boolean;
  placeholder?: string;
  maxLength?: number;
}) {
  const [text, setText] = useState(value === undefined || Number.isNaN(value) ? '' : String(value));

  return (
    <Field label={label} error={error} hint={hint}>
      <Input
        value={text}
        keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
        inputMode={decimal ? 'decimal' : 'numeric'}
        onChangeText={(neu) => {
          setText(neu);
          const sauber = neu.replace(',', '.').trim();
          onChange(sauber === '' ? undefined : Number(sauber));
        }}
        invalid={Boolean(error)}
        {...rest}
      />
    </Field>
  );
}

const styles = StyleSheet.create({
  picker: {
    height: 48, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: 14,
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  suche: { height: 48, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: 14, fontFamily: fonts.regular, fontSize: 15 },
  zeile: { paddingHorizontal: spacing.lg, paddingVertical: 14, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.md, borderWidth: 1 },
});
