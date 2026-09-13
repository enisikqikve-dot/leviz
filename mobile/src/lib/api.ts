import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Der Draht zur API von levizz.com.
 *
 * Alles laeuft ueber `/api/v1` -- denselben Eingang, den die Website-Logik
 * hinter sich hat. Die Token liegen im Schluesselbund des Telefons
 * (SecureStore), nie im normalen Speicher. Laeuft das Zugriffs-Token ab,
 * wird es einmal erneuert und die Anfrage wiederholt; schlaegt auch das fehl,
 * ist die Anmeldung vorbei und die App zeigt das Anmeldeformular.
 */

export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'https://levizz.com').replace(/\/$/, '');

const ZUGRIFF = 'leviz.access';
const ERNEUERUNG = 'leviz.refresh';

// SecureStore gibt es im Browser nicht -- dort haelt die Web-Fassung von Expo
// die Token im localStorage. Sie dient der Entwicklung, nicht dem Betrieb.
const speicher = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS === 'web') return globalThis.localStorage?.getItem(key) ?? null;
    return SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') return void globalThis.localStorage?.setItem(key, value);
    return SecureStore.setItemAsync(key, value);
  },
  async remove(key: string): Promise<void> {
    if (Platform.OS === 'web') return void globalThis.localStorage?.removeItem(key);
    return SecureStore.deleteItemAsync(key);
  },
};

export type Tokens = { accessToken: string; refreshToken: string };

export const tokenStore = {
  async load(): Promise<Tokens | null> {
    const [accessToken, refreshToken] = await Promise.all([speicher.get(ZUGRIFF), speicher.get(ERNEUERUNG)]);
    return accessToken && refreshToken ? { accessToken, refreshToken } : null;
  },
  async save(tokens: Tokens): Promise<void> {
    await Promise.all([speicher.set(ZUGRIFF, tokens.accessToken), speicher.set(ERNEUERUNG, tokens.refreshToken)]);
  },
  async clear(): Promise<void> {
    await Promise.all([speicher.remove(ZUGRIFF), speicher.remove(ERNEUERUNG)]);
  },
};

/**
 * Das Push-Token dieses Geraets, wie es beim Server angemeldet ist -- damit
 * das Abmelden es auch nach einem Neustart der App noch kennt.
 */
const PUSH = 'leviz.push';

/** Kleine Einstellungen der App (Schalter), im selben Speicher. */
export const prefsStore = {
  get: (key: string): Promise<string | null> => speicher.get(key),
  set: (key: string, value: string): Promise<void> => speicher.set(key, value),
  remove: (key: string): Promise<void> => speicher.remove(key),
};

export const pushTokenStore = {
  load: (): Promise<string | null> => speicher.get(PUSH),
  save: (token: string): Promise<void> => speicher.set(PUSH, token),
  clear: (): Promise<void> => speicher.remove(PUSH),
};

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly fields?: { path: string; message: string }[],
  ) {
    super(code);
  }
}

type Antwort<T> = { data: T } | { error: { code: string; message: string; fields?: { path: string; message: string }[] } };

let erneuerungLaeuft: Promise<Tokens | null> | null = null;

/**
 * Erneuert das Token hoechstens einmal gleichzeitig.
 *
 * Laufen drei Anfragen parallel in ein abgelaufenes Token, darf nur eine
 * erneuern -- die anderen warten auf dasselbe Ergebnis. Sonst wuerde die
 * zweite Erneuerung ein bereits ersetztes Token vorlegen, und der Server
 * hielte das fuer Diebstahl.
 */
async function erneuere(): Promise<Tokens | null> {
  if (erneuerungLaeuft) return erneuerungLaeuft;

  erneuerungLaeuft = (async () => {
    const alt = await tokenStore.load();
    if (!alt) return null;

    const antwort = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken: alt.refreshToken }),
    });

    if (!antwort.ok) {
      await tokenStore.clear();
      return null;
    }

    const json = (await antwort.json()) as Antwort<Tokens>;
    if (!('data' in json)) {
      await tokenStore.clear();
      return null;
    }

    await tokenStore.save(json.data);
    return json.data;
  })().finally(() => {
    erneuerungLaeuft = null;
  });

  return erneuerungLaeuft;
}

/** Fuer Anfragen, die nicht ueber `api` laufen (der Upload mit Fortschritt). */
export const refreshTokens = erneuere;

export type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Ohne Token anfragen, auch wenn eines da ist. */
  anonymous?: boolean;
};

export async function api<T>(pfad: string, options: RequestOptions = {}): Promise<T> {
  const versuch = async (token: string | null): Promise<Response> =>
    fetch(`${API_URL}/api/v1${pfad}`, {
      method: options.method ?? 'GET',
      headers: {
        accept: 'application/json',
        ...(options.body !== undefined ? { 'content-type': 'application/json' } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

  const tokens = options.anonymous ? null : await tokenStore.load();
  let antwort = await versuch(tokens?.accessToken ?? null);

  if (antwort.status === 401 && tokens) {
    const neu = await erneuere();
    if (neu) antwort = await versuch(neu.accessToken);
  }

  if (antwort.status === 204) return undefined as T;

  const json = (await antwort.json().catch(() => null)) as Antwort<T> | null;

  if (!antwort.ok || !json || !('data' in json)) {
    const fehler = json && 'error' in json ? json.error : { code: 'network', message: String(antwort.status) };
    throw new ApiError(antwort.status, fehler.code, fehler.fields);
  }

  return json.data;
}

/** Bildadressen der API sind relativ (/uploads/...) oder absolut (Unsplash). */
export function imageUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  return url.startsWith('http') ? url : `${API_URL}${url}`;
}
