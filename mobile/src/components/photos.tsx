import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Button, Txt } from '~/components/ui';
import { api, ApiError, imageUrl } from '~/lib/api';
import { useI18n } from '~/lib/i18n';
import { fonts, radius, spacing, useTheme } from '~/lib/theme';
import type { UploadedImage } from '~/lib/types';
import { prepareImage, uploadImage } from '~/lib/upload';

/**
 * Die Fotos eines Inserats: auswaehlen, verkleinern, hochladen, ordnen.
 *
 * Die Reihenfolge ist die Aussage: das erste Foto ist das Hauptbild, wie auf
 * der Website. Verschoben wird mit Pfeilen -- auf einem Telefon ist ein
 * Griff zum Ziehen zwischen Daumen und Bildrand schnell danebengegriffen,
 * ein Pfeil nie.
 *
 * Jeder Upload hat seinen eigenen Balken. Bei zwanzig Fotos ueber Mobilfunk
 * ist "es laeuft" die wichtigste Information auf dem Bildschirm.
 */
type Laufend = { id: string; uri: string; anteil: number; fehler?: string };

/**
 * Aenderungen kommen als Funktion vom alten Stand zum neuen. Der Upload
 * laeuft ueber mehrere Renderdurchgaenge; wer da mit der Liste vom Anfang
 * rechnet, ueberschreibt das erste Foto mit dem zweiten.
 */
export type ImagesUpdate = (alt: UploadedImage[]) => UploadedImage[];

export function PhotoStep({
  images, max, onChange, error,
}: {
  images: UploadedImage[];
  max: number;
  onChange: (update: ImagesUpdate) => void;
  error?: string;
}) {
  const theme = useTheme();
  const { t } = useI18n();
  const [laufend, setLaufend] = useState<Laufend[]>([]);

  const frei = max - images.length - laufend.length;

  const waehlen = async () => {
    if (frei <= 0) {
      Alert.alert(t('listing.images.limitReached', { max }));
      return;
    }

    if (Platform.OS !== 'web') {
      const rechte = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!rechte.granted) return;
    }

    const auswahl = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: frei,
      quality: 1,
    });
    if (auswahl.canceled) return;

    // Nacheinander, nicht alle auf einmal: ein Kern, ein Netz, und der
    // Server soll nicht zwanzig Dateien gleichzeitig pruefen muessen.
    for (const asset of auswahl.assets.slice(0, frei)) {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setLaufend((alt) => [...alt, { id, uri: asset.uri, anteil: 0 }]);

      try {
        const klein = await prepareImage({ uri: asset.uri, width: asset.width, height: asset.height });
        const hochgeladen = await uploadImage(klein.uri, (anteil) =>
          setLaufend((alt) => alt.map((l) => (l.id === id ? { ...l, anteil } : l))),
        );
        onChange((alt) => [...alt, hochgeladen]);
        setLaufend((alt) => alt.filter((l) => l.id !== id));
      } catch (e) {
        const meldung = e instanceof ApiError && e.status === 429 ? t('auth.errorTooMany') : t('listing.images.uploadFailed');
        setLaufend((alt) => alt.map((l) => (l.id === id ? { ...l, fehler: meldung } : l)));
      }
    }
  };

  const verschiebe = (von: number, nach: number) => {
    if (nach < 0 || nach >= images.length) return;
    onChange((alt) => {
      const neu = [...alt];
      const [bild] = neu.splice(von, 1);
      neu.splice(nach, 0, bild);
      return neu;
    });
  };

  const entferne = async (index: number) => {
    const bild = images[index];
    onChange((alt) => alt.filter((b) => b.key !== bild.key));
    // Eigene Uploads auch auf dem Server loeschen; Beispielbilder liegen extern.
    if (bild.key.startsWith('vehicles/')) {
      await api('/uploads', { method: 'DELETE', body: { key: bild.key } }).catch(() => {});
    }
  };

  return (
    <View style={{ gap: spacing.md }}>
      <Txt variant="small" color={theme.muted}>{t('listing.images.hint', { max })}</Txt>

      <View style={styles.raster}>
        {images.map((bild, index) => (
          <View key={bild.key} style={[styles.kachel, { borderColor: index === 0 ? theme.primary : theme.border, backgroundColor: theme.mutedSurface }]}>
            <Image source={{ uri: imageUrl(bild.url) }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
            {index === 0 ? (
              <View style={[styles.marke, { backgroundColor: theme.primary }]}>
                <Txt variant="caption" color={theme.primaryForeground}>{t('listing.images.mainImage').toUpperCase()}</Txt>
              </View>
            ) : null}
            <View style={styles.werkzeuge}>
              <Knopf label="‹" hint={t('listing.images.moveLeft')} onPress={() => verschiebe(index, index - 1)} disabled={index === 0} />
              <Knopf label="›" hint={t('listing.images.moveRight')} onPress={() => verschiebe(index, index + 1)} disabled={index === images.length - 1} />
              <Knopf label="✕" hint={t('listing.images.remove')} onPress={() => entferne(index)} destructive />
            </View>
          </View>
        ))}

        {laufend.map((l) => (
          <View key={l.id} style={[styles.kachel, { borderColor: l.fehler ? theme.destructive : theme.border, backgroundColor: theme.mutedSurface }]}>
            <Image source={{ uri: l.uri }} style={[StyleSheet.absoluteFill, { opacity: 0.5 }]} contentFit="cover" />
            {l.fehler ? (
              <View style={styles.mitte}>
                <Txt variant="caption" color={theme.destructive} style={{ textAlign: 'center' }}>{l.fehler}</Txt>
                <Pressable onPress={() => setLaufend((alt) => alt.filter((x) => x.id !== l.id))}>
                  <Txt variant="caption" color={theme.foreground}>{t('listing.images.remove').toUpperCase()}</Txt>
                </Pressable>
              </View>
            ) : (
              <View style={styles.mitte}>
                <Txt variant="caption" color={theme.foreground}>{t('listing.images.uploading').toUpperCase()}</Txt>
                <View style={[styles.balken, { backgroundColor: theme.border }]}>
                  <View style={{ width: `${Math.round(l.anteil * 100)}%`, height: '100%', backgroundColor: theme.primary }} />
                </View>
                <Txt variant="caption" color={theme.foreground}>{Math.round(l.anteil * 100)} %</Txt>
              </View>
            )}
          </View>
        ))}

        {frei > 0 ? (
          <Pressable
            accessibilityRole="button"
            onPress={waehlen}
            style={[styles.kachel, styles.hinzu, { borderColor: theme.border }]}
          >
            <Txt variant="h1" color={theme.primary}>+</Txt>
            <Txt variant="small" color={theme.muted}>{t('listing.images.choose')}</Txt>
          </Pressable>
        ) : null}
      </View>

      <View style={{ gap: 4 }}>
        <Txt variant="small" style={{ fontFamily: fonts.medium }}>{t('listing.images.count', { count: images.length, max })}</Txt>
        {images.length > 1 ? <Txt variant="small" color={theme.muted}>{t('listing.images.firstIsMain')}</Txt> : null}
      </View>

      {error ? <Txt variant="small" color={theme.destructive}>{error}</Txt> : null}

      {images.length === 0 && laufend.length === 0 ? (
        <Button label={t('listing.images.choose')} variant="outline" onPress={waehlen} />
      ) : null}
    </View>
  );
}

function Knopf({ label, hint, onPress, disabled, destructive }: { label: string; hint: string; onPress: () => void; disabled?: boolean; destructive?: boolean }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={hint}
      disabled={disabled}
      onPress={onPress}
      style={[styles.knopf, { backgroundColor: destructive ? theme.destructive : theme.ink, opacity: disabled ? 0.35 : 0.92 }]}
    >
      <Txt style={{ color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 16, lineHeight: 18 }}>{label}</Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  raster: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  kachel: { width: '31%', aspectRatio: 1, borderRadius: radius.md, borderWidth: 2, overflow: 'hidden' },
  hinzu: { alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', gap: 2 },
  marke: { position: 'absolute', top: 6, left: 6, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  werkzeuge: { position: 'absolute', bottom: 6, left: 6, right: 6, flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  knopf: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  mitte: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 8 },
  balken: { width: '80%', height: 4, borderRadius: 2, overflow: 'hidden' },
});
