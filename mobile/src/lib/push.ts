import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { api } from './api';

/**
 * Push-Meldungen: das Telefon beim Server anmelden, und abmelden.
 *
 * Das Token kommt vom Push-Dienst von Expo (ExponentPushToken[...]); der
 * Server schickt darueber, Expo reicht an FCM und APNs weiter. Dafuer muss
 * die App eine EAS-Projektkennung haben (`eas init` traegt sie in app.json
 * ein) -- ohne sie gibt es kein Token, und diese Datei sagt das im Protokoll,
 * statt zu stuerzen. Im Browser und im Simulator gibt es nie eines.
 *
 * Alles hier laeuft nur auf einem echten Geraet; jeder Aufruf prueft das
 * selbst, damit kein Bildschirm daran denken muss.
 */
const KANAL = 'default';

let eingerichtet = false;

function moeglich(): boolean {
  return Platform.OS !== 'web' && Device.isDevice;
}

function projektId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? undefined;
}

/** Einmalig: wie eine Meldung im Vordergrund erscheint, und der Android-Kanal. */
export async function initPush(): Promise<void> {
  if (!moeglich() || eingerichtet) return;
  eingerichtet = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(KANAL, {
      name: 'LEVIZ',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2F5BFF',
    });
  }
}

/**
 * Holt das Token dieses Geraets -- fragt dabei einmal nach der Berechtigung.
 * `null`, wenn es keins geben kann: Browser, Simulator, abgelehnt, keine
 * Projektkennung.
 */
export async function pushTokenForThisDevice(): Promise<string | null> {
  if (!moeglich()) return null;
  await initPush();

  const vorhanden = await Notifications.getPermissionsAsync();
  const status = vorhanden.granted ? vorhanden : await Notifications.requestPermissionsAsync();
  if (!status.granted) return null;

  const projectId = projektId();
  if (!projectId) {
    console.warn('  LEVIZ: keine EAS-Projektkennung in app.json -- Push bleibt aus. Einmal `eas init` ausfuehren.');
    return null;
  }

  try {
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    return token.data;
  } catch (fehler) {
    console.warn('  LEVIZ: Push-Token nicht erhalten:', fehler);
    return null;
  }
}

export function platformName(): 'ios' | 'android' | 'web' {
  return Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
}

function geraetename(): string | undefined {
  const teile = [Device.manufacturer, Device.modelName].filter(Boolean);
  return teile.length ? teile.join(' ') : undefined;
}

/** Meldet das Geraet beim Server an. Gibt das Token zurueck, damit das Abmelden es kennt. */
export async function registerDevice(): Promise<string | null> {
  const token = await pushTokenForThisDevice();
  if (!token) return null;

  await api('/devices', { method: 'POST', body: { token, platform: platformName(), device: geraetename() } });
  return token;
}

/** Beim Abmelden: dieses Telefon bekommt nichts mehr. Fehler sind hier egal. */
export async function unregisterDevice(token: string): Promise<void> {
  await api('/devices', { method: 'DELETE', body: { token } }).catch(() => {});
}

/** Das Ziel einer angetippten Meldung: was der Server in `data` mitgab. */
export function targetOf(response: Notifications.NotificationResponse | null | undefined): { href: string; notificationId: string | null } | null {
  const data = response?.notification.request.content.data as Record<string, unknown> | undefined;
  const href = typeof data?.href === 'string' ? data.href : null;
  if (!href) return null;
  return { href, notificationId: typeof data?.notificationId === 'string' ? data.notificationId : null };
}

export const addResponseListener = Notifications.addNotificationResponseReceivedListener;
export const lastResponse = Notifications.getLastNotificationResponseAsync;
