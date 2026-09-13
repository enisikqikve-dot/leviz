import { useMemo, useState } from 'react';
import { Modal, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { parseSearchParams, toQueryString } from '@/features/search/schema';
import { suggestSearchName } from '@/features/searches/name';
import { formatPrice } from '@/lib/currency';

import { Field, Toggle } from '~/components/form';
import { Button, Input, Txt } from '~/components/ui';
import { ApiError } from '~/lib/api';
import { useI18n } from '~/lib/i18n';
import { useCatalog, useSaveSearch } from '~/lib/queries';
import { spacing, useTheme } from '~/lib/theme';

/**
 * Die aktuellen Filter als Suchauftrag speichern.
 *
 * Der Namensvorschlag kommt aus `suggestSearchName` im Hauptprojekt --
 * dieselbe Funktion wie auf der Website, mit denselben Beschriftungen aus
 * den geteilten Sprachdateien. Abgelegt wird genau die Adresszeile der
 * Suche; ein Suchauftrag ohne Filter wird schon hier abgefangen, wie auf
 * dem Server.
 */
export function SaveSearchSheet({
  visible, filters, onClose,
}: {
  visible: boolean;
  filters: Record<string, string | undefined>;
  onClose: (gespeichert: boolean) => void;
}) {
  const theme = useTheme();
  const { t, locale } = useI18n();
  const insets = useSafeAreaInsets();
  const speichern = useSaveSearch();
  const { data: katalog } = useCatalog(locale, filters.make);

  const params = useMemo(() => parseSearchParams(filters as Record<string, string>), [filters]);
  const query = useMemo(() => toQueryString(params), [params]);

  const vorschlag = useMemo(
    () =>
      suggestSearchName(params, {
        brand: katalog?.brands.find((b) => b.slug === params.make)?.name,
        model: katalog?.models.find((m) => m.slug === params.model)?.name,
        city: katalog?.cities.find((c) => c.slug === params.city)?.name,
        fuel: (v) => t(`vehicles.fuel.${v}`),
        transmission: (v) => t(`vehicles.transmission.${v}`),
        body: (v) => t(`vehicles.body.${v}`),
        customs: (v) => t(`vehicles.customs.${v}`),
        price: (eur) => formatPrice(eur * 100, { locale }),
        upTo: t('search.fields.priceTo'),
        from: t('search.fields.priceFrom'),
      }),
    [params, katalog, t, locale],
  );

  const [name, setName] = useState<string | null>(null);
  const [mail, setMail] = useState(true);
  const [fehler, setFehler] = useState<string | null>(null);
  const wert = name ?? vorschlag;

  const absenden = async () => {
    setFehler(null);
    try {
      await speichern.mutateAsync({ name: wert.trim(), query, notifyByEmail: mail });
      setName(null);
      onClose(true);
    } catch (e) {
      if (e instanceof ApiError && e.fields?.length) setFehler(e.fields[0].message);
      else if (e instanceof ApiError && e.status === 400) setFehler(e.message);
      else setFehler(t('auth.genericError'));
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => onClose(false)}>
      <View style={{ flex: 1, backgroundColor: theme.background, padding: spacing.lg, paddingTop: insets.top + spacing.lg, gap: spacing.md }}>
        <Txt variant="h1">{t('searches.saveTitle')}</Txt>
        <Txt color={theme.muted}>{t('searches.saveHint')}</Txt>

        <Field label={t('searches.name')} error={fehler ?? undefined}>
          <Input value={wert} onChangeText={setName} placeholder={t('searches.namePlaceholder')} maxLength={80} invalid={Boolean(fehler)} />
        </Field>
        <Toggle label={t('searches.notifyByEmail')} value={mail} onChange={setMail} />

        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
          <Button label={t('common.cancel')} variant="outline" style={{ flex: 1 }} onPress={() => onClose(false)} />
          <Button label={t('searches.save')} style={{ flex: 1 }} onPress={absenden} loading={speichern.isPending} disabled={wert.trim().length < 2} />
        </View>
      </View>
    </Modal>
  );
}
