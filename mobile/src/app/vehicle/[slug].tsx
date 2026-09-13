import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator, Dimensions, Linking, Pressable, ScrollView, Share, StyleSheet, View,
} from 'react-native';

import { formatMileage, formatPower } from '@/features/vehicles/format';
import { formatPrice } from '@/lib/currency';

import { Button, Card, Chip, Txt } from '~/components/ui';
import { VehicleCard } from '~/components/vehicle-card';
import { API_URL, imageUrl } from '~/lib/api';
import { useAuth } from '~/lib/auth';
import { useI18n } from '~/lib/i18n';
import { useToggleFavorite, useVehicle } from '~/lib/queries';
import { fonts, radius, spacing, useTheme } from '~/lib/theme';

const BREITE = Dimensions.get('window').width;

/**
 * Die Fahrzeugseite: Galerie, Preis, Eckdaten, Zoll und Kennzeichen,
 * Beschreibung, technische Daten, Ausstattung, Verkaeufer, Aehnliche.
 *
 * Dieselben Abschnitte in derselben Reihenfolge wie levizz.com/vetura/...
 * Wer beides benutzt, findet sich sofort zurecht.
 */
export default function VehicleScreen() {
  const theme = useTheme();
  const { t, locale } = useI18n();
  const router = useRouter();
  const { user } = useAuth();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data, isLoading, isError } = useVehicle(slug);
  const toggle = useToggleFavorite();
  const [bild, setBild] = useState(0);

  if (isLoading) return <ActivityIndicator style={{ marginTop: spacing.xxl }} color={theme.primary} />;
  if (isError || !data) {
    return (
      <View style={{ padding: spacing.lg }}>
        <Txt color={theme.muted}>{t('vehicleDetail.notFound')}</Txt>
      </View>
    );
  }

  const { vehicle, similar, estimate, favorited } = data;
  const titel = `${vehicle.brand.name} ${vehicle.model.name}`;
  const jahr = vehicle.firstRegistration ? new Date(vehicle.firstRegistration).getFullYear() : null;
  const telefon = vehicle.dealer?.phone ?? vehicle.seller.phone;
  const ziffern = telefon ? telefon.replace(/\D/g, '') : '';
  const name = { sq: 'nameSq', de: 'nameDe', en: 'nameEn' }[locale] as 'nameSq' | 'nameDe' | 'nameEn';

  // Der Link ist die Adresse der Website -- wer ihn bekommt, landet dort oder,
  // mit installierter App, hier (Phase 3).
  const pfad = { sq: '/vetura/', de: '/de/fahrzeug/', en: '/en/vehicle/' }[locale];
  const webUrl = `${API_URL}${pfad}${vehicle.slug}`;

  const merken = () => {
    if (!user) return router.push('/login');
    toggle.mutate({ vehicleId: vehicle.id, favorited });
  };

  const nachricht = encodeURIComponent(t('vehicleDetail.seller.message', { vehicle: titel, url: webUrl }));

  const daten: [string, string | null][] = [
    [t('vehicles.labels.firstRegistration'), jahr ? String(jahr) : null],
    [t('vehicles.labels.mileage'), vehicle.mileageKm !== null ? formatMileage(vehicle.mileageKm, locale) : null],
    [t('vehicles.labels.fuel'), vehicle.fuel ? t(`vehicles.fuel.${vehicle.fuel}`) : null],
    [t('vehicles.labels.transmission'), vehicle.transmission ? t(`vehicles.transmission.${vehicle.transmission}`) : null],
    [t('vehicles.labels.power'), formatPower(vehicle.powerKw, locale)],
    [t('vehicles.labels.bodyType'), vehicle.bodyType ? t(`vehicles.body.${vehicle.bodyType}`) : null],
    [t('vehicles.labels.drive'), vehicle.driveType ? t(`vehicles.drive.${vehicle.driveType}`) : null],
    [t('vehicles.labels.color'), vehicle.color ? t(`vehicles.colors.${vehicle.color}`) : null],
    [t('vehicles.labels.emission'), vehicle.emissionClass ? t(`vehicles.emission.${vehicle.emissionClass}`) : null],
    [t('vehicles.labels.owners'), vehicle.ownersCount !== null ? String(vehicle.ownersCount) : null],
    [t('vehicles.labels.customsStatus'), t(`vehicles.customs.${vehicle.customsStatus}`)],
    [t('vehicles.labels.plateOrigin'), t(`vehicles.plates.${vehicle.plateOrigin}`)],
    [t('vehicles.labels.importedFrom'), vehicle.importedFrom?.[name] ?? null],
    [t('vehicles.labels.steering'), t(`vehicles.steering.${vehicle.steeringSide}`)],
  ];

  return (
    <>
      <Stack.Screen options={{ title: titel }} />
      <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Galerie: horizontal wischen, Zaehler unten rechts. */}
        <View style={{ backgroundColor: theme.ink }}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => setBild(Math.round(e.nativeEvent.contentOffset.x / BREITE))}
          >
            {vehicle.images.map((img) => (
              <Image
                key={img.url}
                source={{ uri: imageUrl(img.url) }}
                style={{ width: BREITE, aspectRatio: 4 / 3 }}
                contentFit="cover"
                transition={150}
              />
            ))}
          </ScrollView>
          {vehicle.images.length > 1 ? (
            <View style={styles.zaehler}>
              <Txt variant="caption" color="#fff">{bild + 1} / {vehicle.images.length}</Txt>
            </View>
          ) : null}
        </View>

        <View style={styles.block}>
          {vehicle.status === 'SOLD' ? <Chip label={t('vehicleDetail.soldBanner')} tone="warning" /> : null}

          <Txt variant="h1">{titel}</Txt>
          {vehicle.title !== titel ? <Txt color={theme.muted}>{vehicle.title.replace(titel, '').trim()}</Txt> : null}

          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 4 }}>
            <Txt style={styles.preis}>{formatPrice(vehicle.priceCents, { locale })}</Txt>
            {vehicle.negotiable ? <Txt variant="small" color={theme.muted}>{t('vehicles.labels.negotiable')}</Txt> : null}
          </View>

          <View style={styles.chips}>
            {jahr ? <Chip label={String(jahr)} /> : null}
            {vehicle.mileageKm !== null ? <Chip label={formatMileage(vehicle.mileageKm, locale) ?? ''} /> : null}
            {vehicle.fuel ? <Chip label={t(`vehicles.fuel.${vehicle.fuel}`)} /> : null}
            {vehicle.transmission ? <Chip label={t(`vehicles.transmission.${vehicle.transmission}`)} /> : null}
            {vehicle.customsStatus !== 'NOT_APPLICABLE' ? (
              <Chip label={t(`vehicles.customs.${vehicle.customsStatus}`)} tone={vehicle.customsStatus === 'CLEARED' ? 'success' : 'warning'} />
            ) : null}
            {vehicle.plateOrigin !== 'NONE' ? <Chip label={t(`vehicles.plates.${vehicle.plateOrigin}`)} /> : null}
          </View>

          {estimate ? (
            <Card style={{ padding: spacing.lg, gap: 4 }}>
              <Txt variant="h2">{t('estimate.title')}</Txt>
              <Txt variant="small" color={theme.muted}>
                {t('estimate.range', {
                  low: formatPrice(estimate.lowCents, { locale }),
                  high: formatPrice(estimate.highCents, { locale }),
                })}
              </Txt>
              <Txt variant="small" color={theme.muted}>
                {t(estimate.scope === 'model' ? 'estimate.basedOn' : 'estimate.basedOnBrand', { count: estimate.sampleSize })}
              </Txt>
            </Card>
          ) : null}
        </View>

        <Abschnitt title={t('vehicleDetail.sections.description')}>
          <Txt>{vehicle.description}</Txt>
        </Abschnitt>

        <Abschnitt title={t('vehicleDetail.sections.specifications')}>
          <Card>
            {daten
              .filter(([, wert]) => wert)
              .map(([label, wert], i, arr) => (
                <View
                  key={label}
                  style={[styles.zeile, { borderBottomColor: theme.border, borderBottomWidth: i < arr.length - 1 ? 1 : 0 }]}
                >
                  <Txt variant="small" color={theme.muted}>{label}</Txt>
                  <Txt variant="small" style={{ fontFamily: fonts.medium }}>{wert}</Txt>
                </View>
              ))}
          </Card>
        </Abschnitt>

        {vehicle.features.length > 0 ? (
          <Abschnitt title={t('vehicleDetail.sections.equipment')}>
            <View style={styles.chips}>
              {vehicle.features.map((f) => <Chip key={f.feature.slug} label={f.feature[name]} />)}
            </View>
          </Abschnitt>
        ) : null}

        <Abschnitt title={t(vehicle.dealer ? 'vehicleDetail.sections.dealer' : 'vehicleDetail.sections.seller')}>
          <Card style={{ padding: spacing.lg, gap: spacing.md }}>
            <View>
              <Txt variant="h2">{vehicle.dealer?.companyName ?? vehicle.seller.name ?? t('vehicleDetail.seller.private')}</Txt>
              <Txt variant="small" color={theme.muted}>
                {vehicle.dealer
                  ? [vehicle.dealer.city?.name, t('vehicleDetail.seller.vehiclesAvailable', { count: vehicle.dealer._count.vehicles })]
                      .filter(Boolean)
                      .join(' · ')
                  : `${t('vehicleDetail.seller.memberSince')} ${new Date(vehicle.seller.createdAt).getFullYear()}`}
              </Txt>
            </View>

            {telefon ? (
              <View style={{ gap: spacing.sm }}>
                <Button label={`${t('vehicleDetail.callSeller')} · ${telefon}`} onPress={() => Linking.openURL(`tel:${telefon}`)} />
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <Button
                    label={t('vehicleDetail.seller.whatsapp')}
                    variant="outline"
                    style={{ flex: 1 }}
                    onPress={() => Linking.openURL(`https://wa.me/${ziffern}?text=${nachricht}`)}
                  />
                  <Button
                    label={t('vehicleDetail.seller.viber')}
                    variant="outline"
                    style={{ flex: 1 }}
                    onPress={() => Linking.openURL(`viber://chat?number=${encodeURIComponent(`+${ziffern}`)}`)}
                  />
                </View>
              </View>
            ) : (
              // Ohne Telefonnummer bleibt das Kontaktformular der Website.
              // Nachrichten in der App kommen mit Phase 4.
              <Button label={t('vehicleDetail.contactSeller')} variant="outline" onPress={() => Linking.openURL(webUrl)} />
            )}
          </Card>
        </Abschnitt>

        {similar.length > 0 ? (
          <Abschnitt title={t('vehicleDetail.sections.similar')}>
            {similar.map((v) => <VehicleCard key={v.id} vehicle={v} />)}
          </Abschnitt>
        ) : null}
      </ScrollView>

      {/* Fest unten: merken und teilen. */}
      <View style={[styles.leiste, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
        <Pressable onPress={merken} disabled={toggle.isPending} style={[styles.leisteKnopf, { borderColor: theme.border }]}>
          <Txt style={{ fontSize: 18, color: favorited ? theme.destructive : theme.foreground }}>{favorited ? '♥' : '♡'}</Txt>
          <Txt variant="small" style={{ fontFamily: fonts.medium }}>{t('vehicleDetail.save')}</Txt>
        </Pressable>
        <Pressable
          onPress={() => Share.share({ message: `${titel} — ${webUrl}`, url: webUrl })}
          style={[styles.leisteKnopf, { borderColor: theme.border }]}
        >
          <Txt style={{ fontSize: 18 }}>↗</Txt>
          <Txt variant="small" style={{ fontFamily: fonts.medium }}>{t('vehicleDetail.share')}</Txt>
        </Pressable>
      </View>
    </>
  );
}

function Abschnitt({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.block}>
      <Txt variant="h2">{title}</Txt>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, gap: spacing.md },
  zaehler: {
    position: 'absolute', right: 12, bottom: 12, backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full,
  },
  preis: { fontFamily: fonts.bold, fontSize: 28, letterSpacing: -0.5 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  zeile: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: 11 },
  leiste: {
    position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: spacing.md,
    padding: spacing.md, paddingBottom: spacing.xl, borderTopWidth: 1,
  },
  leisteKnopf: {
    flex: 1, height: 48, borderRadius: radius.md, borderWidth: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
});
