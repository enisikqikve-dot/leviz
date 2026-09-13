import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button, Chip, Input, Txt } from '~/components/ui';
import { useI18n } from '~/lib/i18n';
import { useCatalog } from '~/lib/queries';
import { spacing, useTheme } from '~/lib/theme';

/**
 * Die Filter -- dieselben Namen und Werte wie die Suchseite der Website.
 *
 * Marken und Modelle kommen aus dem Katalog der API, die Aufzaehlungen auch;
 * die Beschriftungen aus den geteilten Sprachdateien. Mehrfachwerte
 * (Kraftstoff, Karosserie) wandern kommagetrennt in die Adresse, genau wie
 * bei /kerko?fuel=DIESEL,PETROL.
 */
type Werte = Record<string, string | undefined>;

export default function FiltersScreen() {
  const theme = useTheme();
  const { t, locale } = useI18n();
  const router = useRouter();
  const start = useLocalSearchParams<Record<string, string>>();

  const [werte, setWerte] = useState<Werte>({ ...start });
  const { data: katalog } = useCatalog(locale, werte.make);

  const setze = (key: string, value: string | undefined) =>
    setWerte((alt) => ({ ...alt, [key]: value || undefined, ...(key === 'make' ? { model: undefined } : {}) }));

  const liste = (key: string) => (werte[key] ?? '').split(',').filter(Boolean);
  const schalte = (key: string, value: string) => {
    const aktuell = liste(key);
    const neu = aktuell.includes(value) ? aktuell.filter((v) => v !== value) : [...aktuell, value];
    setze(key, neu.join(','));
  };

  const anwenden = () => {
    const sauber = Object.fromEntries(Object.entries(werte).filter(([, v]) => v)) as Record<string, string>;
    router.dismiss();
    router.replace({ pathname: '/(tabs)/search', params: sauber });
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={styles.inhalt}>
        <Txt variant="h1">{t('search.filters')}</Txt>

        <Gruppe title={t('search.fields.make')}>
          <Chip label={t('search.options.anyMake')} active={!werte.make} onPress={() => setze('make', undefined)} />
          {(katalog?.brands ?? []).slice(0, 30).map((b) => (
            <Chip key={b.slug} label={b.count ? `${b.name} · ${b.count}` : b.name} active={werte.make === b.slug} onPress={() => setze('make', b.slug)} />
          ))}
        </Gruppe>

        {werte.make && (katalog?.models.length ?? 0) > 0 ? (
          <Gruppe title={t('search.fields.model')}>
            <Chip label={t('search.options.anyModel')} active={!werte.model} onPress={() => setze('model', undefined)} />
            {katalog!.models.map((m) => (
              <Chip key={m.slug} label={m.name} active={werte.model === m.slug} onPress={() => setze('model', m.slug)} />
            ))}
          </Gruppe>
        ) : null}

        <View style={styles.paar}>
          <View style={{ flex: 1 }}><Input label={t('search.fields.priceFrom')} keyboardType="number-pad" value={werte.priceMin ?? ''} onChangeText={(v) => setze('priceMin', v.replace(/\D/g, ''))} placeholder="€" /></View>
          <View style={{ flex: 1 }}><Input label={t('search.fields.priceTo')} keyboardType="number-pad" value={werte.priceMax ?? ''} onChangeText={(v) => setze('priceMax', v.replace(/\D/g, ''))} placeholder="€" /></View>
        </View>

        <View style={styles.paar}>
          <View style={{ flex: 1 }}><Input label={t('search.fields.yearFrom')} keyboardType="number-pad" value={werte.yearMin ?? ''} onChangeText={(v) => setze('yearMin', v.replace(/\D/g, '').slice(0, 4))} placeholder="2010" /></View>
          <View style={{ flex: 1 }}><Input label={t('search.fields.yearTo')} keyboardType="number-pad" value={werte.yearMax ?? ''} onChangeText={(v) => setze('yearMax', v.replace(/\D/g, '').slice(0, 4))} placeholder="2026" /></View>
        </View>

        <Input label={t('search.fields.mileageTo')} keyboardType="number-pad" value={werte.mileageMax ?? ''} onChangeText={(v) => setze('mileageMax', v.replace(/\D/g, ''))} placeholder="km" />

        <Gruppe title={t('vehicles.labels.fuel')}>
          {(katalog?.enums.fuel ?? []).map((f) => <Chip key={f} label={t(`vehicles.fuel.${f}`)} active={liste('fuel').includes(f)} onPress={() => schalte('fuel', f)} />)}
        </Gruppe>

        <Gruppe title={t('vehicles.labels.transmission')}>
          {(katalog?.enums.transmission ?? []).map((v) => <Chip key={v} label={t(`vehicles.transmission.${v}`)} active={liste('transmission').includes(v)} onPress={() => schalte('transmission', v)} />)}
        </Gruppe>

        <Gruppe title={t('vehicles.labels.bodyType')}>
          {(katalog?.enums.body ?? []).map((v) => <Chip key={v} label={t(`vehicles.body.${v}`)} active={liste('bodyType').includes(v)} onPress={() => schalte('bodyType', v)} />)}
        </Gruppe>

        <Gruppe title={t('vehicles.labels.customsStatus')}>
          {(katalog?.enums.customs ?? []).map((v) => <Chip key={v} label={t(`vehicles.customs.${v}`)} active={liste('customs').includes(v)} onPress={() => schalte('customs', v)} />)}
        </Gruppe>

        <Gruppe title={t('search.fields.sellerType')}>
          <Chip label={t('search.options.any')} active={!werte.sellerType} onPress={() => setze('sellerType', undefined)} />
          <Chip label={t('search.options.privateSeller')} active={werte.sellerType === 'PRIVATE'} onPress={() => setze('sellerType', 'PRIVATE')} />
          <Chip label={t('search.options.dealerSeller')} active={werte.sellerType === 'DEALER'} onPress={() => setze('sellerType', 'DEALER')} />
        </Gruppe>

        <Gruppe title={t('search.fields.city')}>
          <Chip label={t('search.options.anyCity')} active={!werte.city} onPress={() => setze('city', undefined)} />
          {(katalog?.cities ?? []).slice(0, 20).map((c) => <Chip key={c.slug} label={c.name} active={werte.city === c.slug} onPress={() => setze('city', c.slug)} />)}
        </Gruppe>
      </ScrollView>

      <View style={[styles.fuss, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
        <Button label={t('search.clearFilters')} variant="outline" onPress={() => setWerte({})} style={{ flex: 1 }} />
        <Button label={t('search.applyFilters')} onPress={anwenden} style={{ flex: 2 }} />
      </View>
    </View>
  );
}

function Gruppe({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Txt variant="h2">{title}</Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  inhalt: { padding: spacing.lg, gap: spacing.xl, paddingBottom: 120 },
  paar: { flexDirection: 'row', gap: spacing.md },
  fuss: { flexDirection: 'row', gap: spacing.md, padding: spacing.lg, borderTopWidth: 1 },
});
