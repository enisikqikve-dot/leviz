import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Share, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { STEP_SCHEMAS, STEPS, type ListingFormValues, type StepId } from '@/features/listings/schemas';
import {
  BODY_VALUES, CATEGORY_VALUES, COLOR_VALUES, CUSTOMS_VALUES, DRIVE_VALUES, EMISSION_VALUES,
  FUEL_VALUES, PLATE_VALUES, TRANSMISSION_VALUES,
} from '@/features/search/schema';
import { formatMileage } from '@/features/vehicles/format';
import { calculateQualityScore } from '@/features/vehicles/quality-score';
import { formatPrice } from '@/lib/currency';

import { ChipSelect, Field, MultiChipSelect, NumberField, PickerField, Toggle, type Option } from '~/components/form';
import { PhotoStep, type ImagesUpdate } from '~/components/photos';
import { Button, Card, Chip, Input, Txt } from '~/components/ui';
import { ApiError } from '~/lib/api';
import { useI18n, type Locale } from '~/lib/i18n';
import { webUrlFor } from '~/lib/links';
import { useCatalog, useListingCommand, useListingOptions, useSaveListing } from '~/lib/queries';
import { fonts, radius, spacing, useTheme } from '~/lib/theme';
import type { ListingStatus, PublishResult } from '~/lib/types';

/**
 * Der Inserat-Assistent -- dieselben neun Schritte wie auf der Website.
 *
 * Schritte, Reihenfolge und die Pruefung je Schritt kommen aus dem geteilten
 * Schema des Hauptprojekts: `STEPS` und `STEP_SCHEMAS`. Die App prueft also
 * mit demselben Zod-Schema, mit dem der Server spaeter prueft; was hier
 * durchgeht, geht dort durch. Und der Qualitaetswert in der Vorschau ist
 * dieselbe Funktion, die spaeter die Reihung in der Suche bestimmt.
 *
 * Der Zustand ist ein einziges Objekt in der Form von `ListingFormValues`.
 * Zahlen sind Zahlen, nie Text -- das Schema macht aus "" sonst eine 0.
 */
type Werte = Partial<ListingFormValues>;
type Fehler = Partial<Record<string, string>>;

export function ListingWizard({
  initial, vehicleId, status,
}: {
  initial?: Werte;
  vehicleId?: string;
  status?: ListingStatus;
}) {
  const theme = useTheme();
  const { t, locale } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [werte, setWerte] = useState<Werte>(() => ({
    category: 'CAR', condition: 'USED', accidentFree: true, serviceHistory: false,
    customsStatus: 'CLEARED', plateOrigin: 'RKS', steeringSide: 'LEFT', registrationMonth: 1,
    negotiable: false, vatDeductible: false, financingAvailable: false, leasingAvailable: false,
    hideExactAddress: true, features: [], images: [],
    ...initial,
  }));
  const [schritt, setSchritt] = useState(0);
  const [fehler, setFehler] = useState<Fehler>({});
  const [meldung, setMeldung] = useState<string | null>(null);
  const [gespeichertId, setGespeichertId] = useState<string | undefined>(vehicleId);
  const [ergebnis, setErgebnis] = useState<PublishResult | { status: 'DRAFT' } | null>(null);

  const { data: optionen } = useListingOptions(locale, true);
  const { data: katalog } = useCatalog(locale, werte.brandSlug);
  const speichern = useSaveListing();
  const befehl = useListingCommand();

  const aktuell: StepId = STEPS[schritt];
  const letzter = schritt === STEPS.length - 1;

  const setze = <K extends keyof ListingFormValues>(key: K, value: ListingFormValues[K] | undefined) => {
    setWerte((alt) => ({ ...alt, [key]: value }));
    if (fehler[key]) setFehler((alt) => ({ ...alt, [key]: undefined }));
  };

  /** Prueft den aktuellen Schritt mit dem geteilten Schema. */
  const pruefe = (id: StepId): boolean => {
    const schema = STEP_SCHEMAS[id];
    if (!schema) return true;
    const geprueft = schema.safeParse(werte);
    if (geprueft.success) return true;
    const neu: Fehler = {};
    for (const issue of geprueft.error.issues) {
      const feld = String(issue.path[0] ?? '_');
      neu[feld] ??= issue.message;
    }
    setFehler(neu);
    return false;
  };

  const weiter = () => {
    if (!pruefe(aktuell)) return;
    setFehler({});
    setSchritt((s) => Math.min(s + 1, STEPS.length - 1));
  };

  /** In welchem Schritt wohnt ein Feld? Fuer den Sprung zum Serverfehler. */
  const schrittVon = (feld: string): number => {
    const index = STEPS.findIndex((id) => {
      const schema = STEP_SCHEMAS[id] as { shape?: Record<string, unknown> } | undefined;
      return schema?.shape && feld in schema.shape;
    });
    return index === -1 ? schritt : index;
  };

  const absenden = async (veroeffentlichen: boolean) => {
    setMeldung(null);
    try {
      const gespeichert = await speichern.mutateAsync({ values: werte, id: gespeichertId });
      setGespeichertId(gespeichert.id);

      if (!veroeffentlichen) {
        setErgebnis({ status: 'DRAFT' });
        return;
      }

      const live = (await befehl.mutateAsync({ id: gespeichert.id, command: 'publish' })) as PublishResult;
      setErgebnis(live);
    } catch (e) {
      if (e instanceof ApiError && e.fields?.length) {
        const neu: Fehler = {};
        for (const f of e.fields) neu[f.path] ??= f.message;
        setFehler(neu);
        setSchritt(schrittVon(e.fields[0].path));
        setMeldung(e.message === 'invalid' ? t('common.error') : e.message);
      } else if (e instanceof ApiError && e.status === 400) {
        setMeldung(e.message);
      } else {
        setMeldung(t('auth.genericError'));
      }
    }
  };

  const enumOptionen = (werteListe: readonly string[], ns: string): Option[] =>
    werteListe.map((v) => ({ value: v, label: t(`vehicles.${ns}.${v}`) }));

  const marken = useMemo<Option[]>(() => (optionen?.brands ?? []).map((b) => ({ value: b.slug, label: b.name })), [optionen]);
  const modelle = useMemo<Option[]>(() => (katalog?.models ?? []).map((m) => ({ value: m.slug, label: m.name })), [katalog]);
  const staedte = useMemo<Option[]>(() => (optionen?.cities ?? []).map((c) => ({ value: c.slug, label: c.name, group: c.countryCode })), [optionen]);
  const laender = useMemo<Option[]>(() => (optionen?.importCountries ?? []).map((c) => ({ value: c.code, label: c.name })), [optionen]);

  // --- Fertig -----------------------------------------------------------------
  if (ergebnis) {
    const live = ergebnis.status === 'ACTIVE';
    const pending = ergebnis.status === 'PENDING_REVIEW';
    return (
      <View style={{ flex: 1, backgroundColor: theme.background, padding: spacing.lg, justifyContent: 'center', gap: spacing.lg }}>
        <Txt variant="title" style={{ textAlign: 'center' }}>{live ? '🎉' : pending ? '🕒' : '💾'}</Txt>
        <Txt variant="h1" style={{ textAlign: 'center' }}>
          {live ? t('listing.success.published') : pending ? t('listing.success.pending') : t('listing.nav.saveDraft')}
        </Txt>
        {pending ? <Txt color={theme.muted} style={{ textAlign: 'center' }}>{t('listing.success.pendingHint')}</Txt> : null}
        {live && 'slug' in ergebnis ? (
          <>
            <Button label={t('listing.success.view')} onPress={() => router.replace(`/vehicle/${ergebnis.slug}`)} />
            <Button
              label={t('vehicleDetail.share')}
              variant="outline"
              onPress={() => {
                const url = webUrlFor(locale, '/vehicle/[slug]', { slug: ergebnis.slug });
                Share.share({ message: url, url }).catch(() => {});
              }}
            />
          </>
        ) : null}
        <Button label={t('listing.success.myListings')} variant={live ? 'outline' : 'primary'} onPress={() => router.replace('/listings')} />
      </View>
    );
  }

  // --- Schritte -----------------------------------------------------------------
  const inhalt = () => {
    switch (aktuell) {
      case 'vehicle':
        return (
          <>
            <ChipSelect label={t('listing.fields.category')} value={werte.category} options={enumOptionen(CATEGORY_VALUES, 'category')} onChange={(v) => setze('category', v as ListingFormValues['category'])} />
            <PickerField label={t('listing.fields.brand')} value={werte.brandSlug} options={marken} placeholder={t('search.options.anyMake')} error={fehler.brandSlug}
              onChange={(v) => { setze('brandSlug', v); setze('modelSlug', undefined); }} />
            <PickerField label={t('listing.fields.model')} value={werte.modelSlug} options={modelle} placeholder={t('search.options.anyModel')} error={fehler.modelSlug} disabled={!werte.brandSlug}
              onChange={(v) => setze('modelSlug', v)} />
            <Field label={t('listing.fields.variant')} hint={t('listing.fields.variantHint')} error={fehler.variant}>
              <Input value={werte.variant ?? ''} onChangeText={(v) => setze('variant', v)} invalid={Boolean(fehler.variant)} />
            </Field>
          </>
        );

      case 'technical':
        return (
          <>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <NumberField label={t('listing.fields.registrationYear')} value={werte.registrationYear as number | undefined} onChange={(v) => setze('registrationYear', v)} error={fehler.registrationYear} maxLength={4} />
              </View>
              <View style={{ flex: 1 }}>
                <NumberField label={t('listing.fields.registrationMonth')} value={werte.registrationMonth as number | undefined} onChange={(v) => setze('registrationMonth', v)} error={fehler.registrationMonth} maxLength={2} />
              </View>
            </View>
            <NumberField label={t('listing.fields.mileage')} value={werte.mileageKm as number | undefined} onChange={(v) => setze('mileageKm', v)} error={fehler.mileageKm} />
            <ChipSelect label={t('listing.fields.fuel')} value={werte.fuel} options={enumOptionen(FUEL_VALUES, 'fuel')} error={fehler.fuel} onChange={(v) => setze('fuel', v as ListingFormValues['fuel'])} />
            <ChipSelect label={t('listing.fields.transmission')} value={werte.transmission} options={enumOptionen(TRANSMISSION_VALUES, 'transmission')} error={fehler.transmission} onChange={(v) => setze('transmission', v as ListingFormValues['transmission'])} />
            <NumberField label={t('listing.fields.power')} value={werte.powerKw as number | undefined} onChange={(v) => setze('powerKw', v)} error={fehler.powerKw} />
            <ChipSelect label={t('listing.fields.bodyType')} value={werte.bodyType} options={enumOptionen(BODY_VALUES, 'body')} error={fehler.bodyType} onChange={(v) => setze('bodyType', v as ListingFormValues['bodyType'])} />
            <ChipSelect label={t('listing.fields.driveType')} value={werte.driveType} options={enumOptionen(DRIVE_VALUES, 'drive')} allowNone onChange={(v) => setze('driveType', v as ListingFormValues['driveType'])} />
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}><NumberField label={t('listing.fields.doors')} value={werte.doors as number | undefined} onChange={(v) => setze('doors', v)} error={fehler.doors} /></View>
              <View style={{ flex: 1 }}><NumberField label={t('listing.fields.seats')} value={werte.seats as number | undefined} onChange={(v) => setze('seats', v)} error={fehler.seats} /></View>
            </View>
            <NumberField label={t('listing.fields.displacement')} value={werte.displacementCcm as number | undefined} onChange={(v) => setze('displacementCcm', v)} error={fehler.displacementCcm} />
            <ChipSelect label={t('listing.fields.color')} value={werte.color} options={enumOptionen(COLOR_VALUES, 'colors')} allowNone onChange={(v) => setze('color', v as ListingFormValues['color'])} />
            <ChipSelect label={t('listing.fields.interiorColor')} value={werte.interiorColor} options={enumOptionen(COLOR_VALUES, 'colors')} allowNone onChange={(v) => setze('interiorColor', v as ListingFormValues['interiorColor'])} />
            <ChipSelect label={t('listing.fields.emission')} value={werte.emissionClass} options={enumOptionen(EMISSION_VALUES, 'emission')} allowNone onChange={(v) => setze('emissionClass', v as ListingFormValues['emissionClass'])} />
            <NumberField label={t('listing.fields.consumption')} value={werte.consumptionCombined as number | undefined} onChange={(v) => setze('consumptionCombined', v)} error={fehler.consumptionCombined} decimal />
            {werte.fuel && ['ELECTRIC', 'HYBRID_PETROL', 'HYBRID_DIESEL', 'PLUGIN_HYBRID'].includes(werte.fuel) ? (
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <View style={{ flex: 1 }}><NumberField label={t('listing.fields.range')} value={werte.electricRangeKm as number | undefined} onChange={(v) => setze('electricRangeKm', v)} /></View>
                <View style={{ flex: 1 }}><NumberField label={t('listing.fields.battery')} value={werte.batteryCapacityKwh as number | undefined} onChange={(v) => setze('batteryCapacityKwh', v)} decimal /></View>
              </View>
            ) : null}
          </>
        );

      case 'condition':
        return (
          <>
            <ChipSelect label={t('listing.fields.condition')} value={werte.condition} options={enumOptionen(['NEW', 'USED'], 'condition')} onChange={(v) => setze('condition', v as ListingFormValues['condition'])} />
            <Toggle label={t('listing.fields.accidentFree')} value={werte.accidentFree ?? true} onChange={(v) => setze('accidentFree', v)} />
            <Toggle label={t('listing.fields.serviceHistory')} value={werte.serviceHistory ?? false} onChange={(v) => setze('serviceHistory', v)} />
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}><NumberField label={t('listing.fields.warranty')} value={werte.warrantyMonths as number | undefined} onChange={(v) => setze('warrantyMonths', v)} error={fehler.warrantyMonths} /></View>
              <View style={{ flex: 1 }}><NumberField label={t('listing.fields.owners')} value={werte.ownersCount as number | undefined} onChange={(v) => setze('ownersCount', v)} error={fehler.ownersCount} /></View>
            </View>
            <Field label={t('listing.fields.vin')} error={fehler.vin}>
              <Input value={werte.vin ?? ''} onChangeText={(v) => setze('vin', v.toUpperCase())} autoCapitalize="characters" maxLength={17} invalid={Boolean(fehler.vin)} />
            </Field>
            <ChipSelect label={t('listing.fields.customsStatus')} value={werte.customsStatus} options={enumOptionen(CUSTOMS_VALUES, 'customs')} onChange={(v) => setze('customsStatus', v as ListingFormValues['customsStatus'])} />
            <ChipSelect label={t('listing.fields.plateOrigin')} value={werte.plateOrigin} options={enumOptionen(PLATE_VALUES, 'plates')} onChange={(v) => setze('plateOrigin', v as ListingFormValues['plateOrigin'])} />
            <PickerField label={t('listing.fields.importedFrom')} value={werte.importedFromCode || undefined} options={laender} placeholder="—" onChange={(v) => setze('importedFromCode', v ?? '')} />
            <Field label={t('listing.fields.registeredUntil')} error={fehler.registeredUntil}>
              <Input value={werte.registeredUntil ?? ''} onChangeText={(v) => setze('registeredUntil', v)} placeholder="2027-06-30" autoCapitalize="none" invalid={Boolean(fehler.registeredUntil)} />
            </Field>
            <ChipSelect label={t('listing.fields.steering')} value={werte.steeringSide} options={enumOptionen(['LEFT', 'RIGHT'], 'steering')} onChange={(v) => setze('steeringSide', v as ListingFormValues['steeringSide'])} />
          </>
        );

      case 'features': {
        const gruppen = new Map<string, Option[]>();
        for (const f of optionen?.features ?? []) {
          const liste = gruppen.get(f.group) ?? [];
          liste.push({ value: f.slug, label: f.label });
          gruppen.set(f.group, liste);
        }
        return (
          <>
            {[...gruppen.entries()].map(([gruppe, liste]) => (
              <View key={gruppe} style={{ gap: 8 }}>
                {/* Die Gruppe heisst auf der Website genauso: der rohe Name aus dem Katalog. */}
                <Txt variant="caption" color={theme.muted}>{gruppe.toUpperCase()}</Txt>
                <MultiChipSelect values={werte.features ?? []} options={liste} onChange={(v) => setze('features', v)} />
              </View>
            ))}
          </>
        );
      }

      case 'images':
        return (
          <PhotoStep
            images={werte.images ?? []}
            max={optionen?.photoLimit ?? 30}
            error={fehler.images}
            onChange={(update: ImagesUpdate) => {
              setWerte((alt) => ({ ...alt, images: update(alt.images ?? []) }));
              if (fehler.images) setFehler((alt) => ({ ...alt, images: undefined }));
            }}
          />
        );

      case 'price':
        return (
          <>
            <NumberField label={t('listing.fields.price')} value={werte.priceEur as number | undefined} onChange={(v) => setze('priceEur', v)} error={fehler.priceEur} />
            <Toggle label={t('listing.fields.negotiable')} value={werte.negotiable ?? false} onChange={(v) => setze('negotiable', v)} />
            <Toggle label={t('listing.fields.vat')} value={werte.vatDeductible ?? false} onChange={(v) => setze('vatDeductible', v)} />
            <Toggle label={t('listing.fields.financing')} value={werte.financingAvailable ?? false} onChange={(v) => setze('financingAvailable', v)} />
            <Toggle label={t('listing.fields.leasing')} value={werte.leasingAvailable ?? false} onChange={(v) => setze('leasingAvailable', v)} />
          </>
        );

      case 'location':
        return (
          <>
            <PickerField label={t('listing.fields.city')} value={werte.citySlug} options={staedte} placeholder={t('search.fields.city')} error={fehler.citySlug} onChange={(v) => setze('citySlug', v)} />
            <Field label={t('listing.fields.postalCode')} error={fehler.postalCode}>
              <Input value={werte.postalCode ?? ''} onChangeText={(v) => setze('postalCode', v)} keyboardType="number-pad" maxLength={12} />
            </Field>
            <Field label={t('listing.fields.address')} error={fehler.addressLine}>
              <Input value={werte.addressLine ?? ''} onChangeText={(v) => setze('addressLine', v)} maxLength={160} />
            </Field>
            <Toggle label={t('listing.fields.hideAddress')} value={werte.hideExactAddress ?? true} onChange={(v) => setze('hideExactAddress', v)} />
          </>
        );

      case 'description':
        return (
          <Field label={t('listing.fields.description')} hint={t('listing.fields.descriptionHint')} error={fehler.description}>
            <TextInput
              multiline
              textAlignVertical="top"
              value={werte.description ?? ''}
              onChangeText={(v) => setze('description', v)}
              maxLength={6000}
              placeholderTextColor={theme.muted}
              style={[styles.beschreibung, { backgroundColor: theme.card, borderColor: fehler.description ? theme.destructive : theme.border, color: theme.foreground }]}
            />
            <Txt variant="caption" color={theme.muted} style={{ textAlign: 'right' }}>{(werte.description ?? '').length} / 6000</Txt>
          </Field>
        );

      case 'preview':
        return <Vorschau werte={werte} marken={marken} modelle={modelle} locale={locale} max={optionen?.photoLimit ?? 30} />;
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: 140 }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 6 }}>
          <Txt variant="caption" color={theme.muted}>{t('listing.stepOf', { current: schritt + 1, total: STEPS.length }).toUpperCase()}</Txt>
          <Txt variant="h1">{t(`listing.steps.${aktuell}`)}</Txt>
          <View style={[styles.balken, { backgroundColor: theme.border }]}>
            <View style={{ width: `${Math.round(((schritt + 1) / STEPS.length) * 100)}%`, height: '100%', backgroundColor: theme.primary }} />
          </View>
          {status ? (
            <View style={{ flexDirection: 'row', marginTop: 4 }}>
              <Chip label={t(`myListings.status.${status}`)} tone={status === 'ACTIVE' ? 'success' : 'muted'} />
            </View>
          ) : null}
        </View>

        {inhalt()}

        {meldung ? (
          <View style={[styles.meldung, { backgroundColor: theme.warningSoft }]}>
            <Txt variant="small" color={theme.warning}>{meldung}</Txt>
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.leiste, { backgroundColor: theme.background, borderColor: theme.border, paddingBottom: insets.bottom + spacing.sm }]}>
        {letzter ? (
          <>
            <Button label={t('listing.nav.saveDraft')} variant="outline" style={{ flex: 1 }} onPress={() => absenden(false)} loading={speichern.isPending && !befehl.isPending} disabled={befehl.isPending} />
            <Button label={t('listing.nav.publish')} style={{ flex: 1 }} onPress={() => absenden(true)} loading={befehl.isPending || speichern.isPending} />
          </>
        ) : (
          <>
            <Button label={t('listing.nav.back')} variant="outline" onPress={() => setSchritt((s) => Math.max(0, s - 1))} disabled={schritt === 0} />
            <Button label={t('listing.nav.next')} style={{ flex: 1 }} onPress={weiter} />
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

/**
 * Die Vorschau: das Inserat, wie es die Karte zeigen wird, und der
 * Qualitaetswert mit den Hinweisen, die am meisten bringen -- aus derselben
 * Funktion, die spaeter die Reihung in der Suche bestimmt.
 */
function Vorschau({ werte, marken, modelle, locale, max }: { werte: Werte; marken: Option[]; modelle: Option[]; locale: Locale; max: number }) {
  const theme = useTheme();
  const { t } = useI18n();

  const marke = marken.find((m) => m.value === werte.brandSlug)?.label ?? '';
  const modell = modelle.find((m) => m.value === werte.modelSlug)?.label ?? '';
  const titel = [marke, modell, werte.variant].filter(Boolean).join(' ');

  const quality = calculateQualityScore({
    photoCount: werte.images?.length ?? 0,
    descriptionLength: werte.description?.length ?? 0,
    featureCount: werte.features?.length ?? 0,
    hasMileage: werte.mileageKm !== undefined,
    hasFirstRegistration: werte.registrationYear !== undefined,
    hasFuel: Boolean(werte.fuel),
    hasTransmission: Boolean(werte.transmission),
    hasPower: werte.powerKw !== undefined,
    hasBodyType: Boolean(werte.bodyType),
    hasDriveType: Boolean(werte.driveType),
    hasColor: Boolean(werte.color),
    hasCustomsStatus: werte.customsStatus !== 'NOT_APPLICABLE',
    hasServiceHistory: Boolean(werte.serviceHistory),
    hasAccidentInfo: true,
    hasVin: Boolean(werte.vin),
    sellerVerified: false,
  });
  const ton = quality.score >= 80 ? theme.success : quality.score >= 55 ? theme.featured : theme.destructive;

  const zeilen: [string, string | null][] = [
    [t('vehicles.labels.price'), werte.priceEur != null ? formatPrice(Number(werte.priceEur) * 100, { locale }) : null],
    [t('vehicles.labels.firstRegistration'), werte.registrationYear ? `${String(werte.registrationMonth ?? 1).padStart(2, '0')}/${werte.registrationYear}` : null],
    [t('vehicles.labels.mileage'), werte.mileageKm !== undefined ? formatMileage(Number(werte.mileageKm), locale) : null],
    [t('vehicles.labels.fuel'), werte.fuel ? t(`vehicles.fuel.${werte.fuel}`) : null],
    [t('vehicles.labels.transmission'), werte.transmission ? t(`vehicles.transmission.${werte.transmission}`) : null],
    [t('vehicles.labels.customsStatus'), werte.customsStatus ? t(`vehicles.customs.${werte.customsStatus}`) : null],
    [t('vehicles.labels.plateOrigin'), werte.plateOrigin ? t(`vehicles.plates.${werte.plateOrigin}`) : null],
  ];

  return (
    <>
      <Card style={{ padding: spacing.lg, gap: spacing.sm }}>
        <Txt variant="h2">{titel || t('listing.preview.title')}</Txt>
        {zeilen.filter(([, v]) => v).map(([k, v]) => (
          <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
            <Txt variant="small" color={theme.muted}>{k}</Txt>
            <Txt variant="small" style={{ fontFamily: fonts.medium }}>{v}</Txt>
          </View>
        ))}
        <Txt variant="small" color={theme.muted}>{t('listing.images.count', { count: werte.images?.length ?? 0, max })}</Txt>
      </Card>

      <Card style={{ padding: spacing.lg, gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Txt variant="h2">{t('listing.quality.title')}</Txt>
          <Txt variant="h1" color={ton}>{quality.score}%</Txt>
        </View>
        <View style={[styles.balken, { backgroundColor: theme.border }]}>
          <View style={{ width: `${quality.score}%`, height: '100%', backgroundColor: ton }} />
        </View>
        {quality.hints.map((hint) => (
          <View key={hint.key} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
            <Txt variant="small" style={{ flex: 1 }}>{t(`listing.quality.${hint.key}`, hint.values)}</Txt>
            <Txt variant="small" color={theme.success}>{t('listing.quality.gain', { gain: hint.gain })}</Txt>
          </View>
        ))}
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  balken: { height: 6, borderRadius: 3, overflow: 'hidden' },
  beschreibung: { minHeight: 180, borderRadius: radius.md, borderWidth: 1, padding: 14, fontFamily: fonts.regular, fontSize: 15, lineHeight: 21 },
  meldung: { padding: 12, borderRadius: radius.md },
  leiste: {
    position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: spacing.sm,
    padding: spacing.md, borderTopWidth: 1,
  },
});
