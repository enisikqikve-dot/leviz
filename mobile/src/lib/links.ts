import type { Href } from 'expo-router';
import { Linking } from 'react-native';

import { matchPathname } from '@/lib/i18n/match-pathname';
import { defaultLocale, pathnames, type Locale } from '@/lib/i18n/pathnames';

import { API_URL } from './api';

/**
 * Adressen in beide Richtungen.
 *
 * Eine Website-Adresse kommt in die App als Universal Link, App Link oder
 * als Ziel einer Push-Meldung. `targetFor` sagt, welcher Bildschirm das ist
 * -- oder dass die App ihn nicht hat und die Website ihn zeigen soll. Die
 * Zuordnung Adresse -> Route kommt aus `matchPathname` im Hauptprojekt; hier
 * steht nur noch, welcher Bildschirm zu welcher Route gehoert.
 *
 * `webUrlFor` geht den anderen Weg: aus einer Route wird die Adresse auf
 * levizz.com in der Sprache der App, zum Teilen.
 */
export type Target = { href: Href } | { web: string };

export function targetFor(input: string): Target {
  const web = /^https?:\/\//.test(input) ? input : `${API_URL}${input.startsWith('/') ? '' : '/'}${input}`;
  const treffer = matchPathname(input);
  if (!treffer) return { web };

  const { key, params, search } = treffer;
  switch (key) {
    case '/':
      return { href: '/' };
    case '/vehicle/[slug]':
      return { href: `/vehicle/${params.slug}` };
    case '/search':
      return { href: `/search${search}` as Href };
    case '/favorites':
      return { href: '/favorites' };
    case '/dashboard':
    case '/dashboard/listings':
      return { href: '/listings' };
    case '/sell/create':
      return { href: '/listings/new' };
    case '/sell/edit/[id]':
      return { href: `/listings/${params.id}` };
    case '/dashboard/settings':
      return { href: '/profile' };
    case '/login':
      return { href: '/login' };
    case '/register':
      return { href: '/register' };
    case '/messages':
      return { href: '/messages' };
    case '/messages/[id]':
      return { href: `/messages/${params.id}` };
    case '/searches':
      return { href: '/searches' };
    case '/dealers':
      return { href: '/dealers' };
    case '/dealer/[slug]':
      return { href: `/dealer/${params.slug}` };
    default:
      // Vergleich, Bewertung, rechtliche Seiten: Website.
      return { web };
  }
}

/** Oeffnet ein Ziel: in der App, wenn sie es hat, sonst im Browser. */
export function openTarget(router: { push: (href: Href) => void }, input: string): void {
  const ziel = targetFor(input);
  if ('href' in ziel) router.push(ziel.href);
  else Linking.openURL(ziel.web).catch(() => {});
}

/** Die Adresse auf levizz.com fuer eine Route, in der Sprache der App. */
export function webUrlFor(locale: Locale, key: keyof typeof pathnames, params: Record<string, string> = {}): string {
  const eintrag = pathnames[key];
  let pfad: string = typeof eintrag === 'string' ? eintrag : eintrag[locale];
  for (const [name, wert] of Object.entries(params)) pfad = pfad.replace(`[${name}]`, encodeURIComponent(wert));
  const praefix = locale === defaultLocale ? '' : `/${locale}`;
  return `${API_URL}${praefix}${pfad === '/' ? '' : pfad}`;
}
