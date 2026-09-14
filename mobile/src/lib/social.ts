import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';

/**
 * Anmeldung mit Google- oder Apple-Konto -- die Dialoge des Systems.
 *
 * Die App spricht selbst mit dem Anbieter und bekommt ein ID-Token; das
 * geht an /api/v1/auth/social, und der Server prueft es (lib/auth/id-token
 * im Hauptprojekt). Hier steht nur, was das Telefon dafuer braucht.
 *
 * Google braucht die Web-Client-ID (dieselbe wie AUTH_GOOGLE_ID auf dem
 * Server -- auf sie stellt Google das Token aus) und auf iOS zusaetzlich die
 * iOS-Client-ID. Fehlen sie, gibt es den Knopf nicht: ein Knopf, der in
 * einem Fehler von Google endet, hilft niemandem. Apple braucht nichts
 * ausser der Faehigkeit "Sign in with Apple" der App -- und gibt es nur auf
 * iOS.
 *
 * Auf dem Web (Entwicklung im Browser) gibt es beides nicht; die
 * Google-Bibliothek hat dort keine Umsetzung.
 */
export type SocialProvider = 'google' | 'apple';

export type SocialCredential = {
  provider: SocialProvider;
  idToken: string;
  /** Google: aus dem Konto. Apple: nur beim allerersten Mal. */
  name: string | null;
};

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

export function googleAvailable(): boolean {
  if (Platform.OS === 'web') return false;
  if (!GOOGLE_WEB_CLIENT_ID) return false;
  return Platform.OS !== 'ios' || Boolean(GOOGLE_IOS_CLIENT_ID);
}

export async function appleAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

/** Der Nutzer hat den Dialog geschlossen -- kein Fehler, nur nichts. */
export class SocialCancelled extends Error {
  constructor() {
    super('abgebrochen');
    this.name = 'SocialCancelled';
  }
}

let googleEingerichtet = false;

/**
 * Die Google-Bibliothek erst beim Aufruf laden: auf dem Web wirft schon
 * ihr Laden Warnungen, und dort wird sie nie gebraucht.
 */
function google() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const modul = require('@react-native-google-signin/google-signin') as typeof import('@react-native-google-signin/google-signin');
  if (!googleEingerichtet) {
    modul.GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      iosClientId: GOOGLE_IOS_CLIENT_ID,
      // Nur wer man ist -- kein Kalender, keine Kontakte.
      scopes: ['email', 'profile'],
    });
    googleEingerichtet = true;
  }
  return modul;
}

export async function signInWithGoogle(): Promise<SocialCredential> {
  if (!googleAvailable()) throw new Error('Google-Anmeldung nicht eingerichtet');
  const { GoogleSignin, statusCodes, isErrorWithCode } = google();

  try {
    // Android ohne Google-Dienste (manche Huawei): der Dialog erklaert es.
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const antwort = await GoogleSignin.signIn();
    if (antwort.type !== 'success') throw new SocialCancelled();
    if (!antwort.data.idToken) throw new Error('Google hat kein ID-Token geliefert');

    return { provider: 'google', idToken: antwort.data.idToken, name: antwort.data.user.name };
  } catch (fehler) {
    if (isErrorWithCode(fehler) && fehler.code === statusCodes.SIGN_IN_CANCELLED) throw new SocialCancelled();
    throw fehler;
  }
}

export async function signInWithApple(): Promise<SocialCredential> {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    if (!credential.identityToken) throw new Error('Apple hat kein ID-Token geliefert');

    // Den Namen gibt Apple nur beim ersten Einverstaendnis heraus. Danach
    // kommt null -- der Server behaelt dann den gespeicherten.
    const name = credential.fullName
      ? [credential.fullName.givenName, credential.fullName.familyName].filter(Boolean).join(' ') || null
      : null;

    return { provider: 'apple', idToken: credential.identityToken, name };
  } catch (fehler) {
    if ((fehler as { code?: string }).code === 'ERR_REQUEST_CANCELED') throw new SocialCancelled();
    throw fehler;
  }
}
