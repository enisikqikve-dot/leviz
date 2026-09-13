import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Platform } from 'react-native';

import { JPEG_QUALITY, MAX_EDGE } from '@/features/listings/image-policy';

import { API_URL, ApiError, refreshTokens, tokenStore } from './api';
import type { UploadedImage } from './types';

/**
 * Ein Foto vom Telefon auf den Server -- verkleinert, mit Fortschritt.
 *
 * Verkleinert wird auf dieselbe Kante wie im Browser (1920 px, JPEG 82 %):
 * die Zahlen kommen aus dem Hauptprojekt. Ein 5-MB-Handyfoto wird so zu
 * ~300 KB, bevor es ins Mobilfunknetz geht.
 *
 * Hochgeladen wird per XMLHttpRequest statt fetch, weil nur XHR den
 * Fortschritt des Sendens meldet -- und bei zwanzig Fotos ueber eine
 * schwache Verbindung ist ein Balken, der sich bewegt, der Unterschied
 * zwischen "es laeuft" und "es haengt".
 */
export type PickedImage = { uri: string; width: number; height: number };

export async function prepareImage(bild: PickedImage): Promise<PickedImage> {
  const scale = Math.min(1, MAX_EDGE / Math.max(bild.width, bild.height));

  const kontext = ImageManipulator.manipulate(bild.uri);
  // Nur die Breite: die Hoehe folgt im Seitenverhaeltnis.
  if (scale < 1) kontext.resize({ width: Math.round(bild.width * scale) });

  const gerendert = await kontext.renderAsync();
  try {
    const ergebnis = await gerendert.saveAsync({ format: SaveFormat.JPEG, compress: JPEG_QUALITY });
    return { uri: ergebnis.uri, width: ergebnis.width, height: ergebnis.height };
  } finally {
    gerendert.release();
  }
}

type Antwort = { status: number; json: { data?: UploadedImage; error?: { code: string; message: string } } | null };

async function sende(uri: string, token: string | null, onProgress: (anteil: number) => void): Promise<Antwort> {
  const form = new FormData();
  if (Platform.OS === 'web') {
    // Im Browser ist die Adresse ein blob: -- die Datei selbst muss mit.
    const blob = await fetch(uri).then((r) => r.blob());
    form.append('file', blob, 'foto.jpg');
  } else {
    // React Native nimmt {uri, name, type} und liest die Datei beim Senden.
    form.append('file', { uri, name: 'foto.jpg', type: 'image/jpeg' } as unknown as Blob);
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_URL}/api/v1/uploads`);
    xhr.setRequestHeader('accept', 'application/json');
    if (token) xhr.setRequestHeader('authorization', `Bearer ${token}`);
    xhr.upload.onprogress = (ereignis) => {
      if (ereignis.lengthComputable) onProgress(ereignis.loaded / ereignis.total);
    };
    xhr.onload = () => {
      let json: Antwort['json'] = null;
      try {
        json = JSON.parse(xhr.responseText);
      } catch {
        json = null;
      }
      resolve({ status: xhr.status, json });
    };
    xhr.onerror = () => reject(new ApiError(0, 'network'));
    xhr.send(form);
  });
}

export async function uploadImage(uri: string, onProgress: (anteil: number) => void): Promise<UploadedImage> {
  const tokens = await tokenStore.load();
  let antwort = await sende(uri, tokens?.accessToken ?? null, onProgress);

  // Abgelaufenes Token: einmal erneuern, einmal wiederholen -- wie in `api`.
  if (antwort.status === 401 && tokens) {
    const neu = await refreshTokens();
    if (neu) antwort = await sende(uri, neu.accessToken, onProgress);
  }

  if (antwort.status !== 201 || !antwort.json?.data) {
    throw new ApiError(antwort.status, antwort.json?.error?.code ?? 'upload-failed');
  }

  return antwort.json.data;
}
