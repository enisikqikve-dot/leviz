import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatMileage, formatPower } from '@/features/vehicles/format';
import { formatPrice } from '@/lib/currency';

import { imageUrl } from '~/lib/api';
import { useI18n } from '~/lib/i18n';
import { fonts, radius, spacing, useTheme } from '~/lib/theme';
import type { VehicleCard as Card } from '~/lib/types';

import { Chip, Txt } from './ui';

/**
 * Die Fahrzeugkarte -- dieselben Angaben, dieselbe Reihenfolge wie auf der
 * Website: Foto, Marke und Modell, Eckdaten, Zoll und Kennzeichen, Preis.
 *
 * Preis und Kilometer formatiert dieselbe Funktion wie auf levizz.com
 * (@/lib/currency, @/features/vehicles/format). Zwei Stellen, die 18.500
 * verschieden schreiben, gibt es damit nicht.
 */
export function VehicleCard({ vehicle }: { vehicle: Card }) {
  const theme = useTheme();
  const { t, locale } = useI18n();

  const jahr = vehicle.firstRegistration ? new Date(vehicle.firstRegistration).getFullYear() : null;
  const bild = imageUrl(vehicle.images[0]?.url);

  const daten = [
    jahr ? String(jahr) : null,
    vehicle.mileageKm !== null ? formatMileage(vehicle.mileageKm, locale) : null,
    vehicle.fuel ? t(`vehicles.fuel.${vehicle.fuel}`) : null,
    vehicle.transmission ? t(`vehicles.transmission.${vehicle.transmission}`) : null,
    vehicle.powerKw ? formatPower(vehicle.powerKw, locale) : null,
  ].filter(Boolean);

  return (
    <Link href={{ pathname: '/vehicle/[slug]', params: { slug: vehicle.slug } }} asChild>
      <Pressable style={({ pressed }) => [styles.card, { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.92 : 1 }]}>
        <View style={[styles.bild, { backgroundColor: theme.mutedSurface }]}>
          {bild ? <Image source={{ uri: bild }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} /> : null}
          {vehicle.featuredScore > 0 ? (
            <View style={[styles.featured, { backgroundColor: theme.featured }]}>
              <Txt variant="caption" color={theme.featuredForeground}>{t('vehicles.badges.featured')}</Txt>
            </View>
          ) : null}
        </View>

        <View style={styles.inhalt}>
          <Txt variant="h2" numberOfLines={1}>{vehicle.brand.name} {vehicle.model.name}</Txt>
          <Txt variant="small" color={theme.muted} numberOfLines={1}>{daten.join(' · ')}</Txt>

          <View style={styles.chips}>
            {vehicle.customsStatus !== 'NOT_APPLICABLE' ? (
              <Chip label={t(`vehicles.customs.${vehicle.customsStatus}`)} tone={vehicle.customsStatus === 'CLEARED' ? 'success' : 'warning'} />
            ) : null}
            {vehicle.plateOrigin !== 'NONE' ? <Chip label={t(`vehicles.plates.${vehicle.plateOrigin}`)} /> : null}
          </View>

          <View style={styles.preisZeile}>
            <Txt style={styles.preis}>{formatPrice(vehicle.priceCents, { locale })}</Txt>
            {vehicle.negotiable ? <Txt variant="small" color={theme.muted}>{t('vehicles.labels.negotiable')}</Txt> : null}
          </View>

          {vehicle.standing === 'below' ? (
            <Txt variant="small" color={theme.success} style={{ fontFamily: fonts.medium }}>↘ {t('vehicles.badges.belowMarket')}</Txt>
          ) : null}

          <Txt variant="small" color={theme.muted} numberOfLines={1}>
            {[vehicle.city?.name, vehicle.dealer?.companyName ?? t('vehicles.badges.private')].filter(Boolean).join(' · ')}
          </Txt>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },
  bild: { aspectRatio: 4 / 3 },
  featured: { position: 'absolute', top: 10, left: 10, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.full },
  inhalt: { padding: spacing.lg, gap: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  preisZeile: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 4 },
  preis: { fontFamily: fonts.bold, fontSize: 20, letterSpacing: -0.3 },
});
