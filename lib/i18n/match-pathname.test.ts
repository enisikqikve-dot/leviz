import { describe, expect, it } from 'vitest';

import { matchPathname } from './match-pathname';

describe('matchPathname', () => {
  it('erkennt Fahrzeugseiten in allen drei Sprachen', () => {
    expect(matchPathname('/vetura/bmw-320d-2019-prishtine-x1')).toEqual({
      key: '/vehicle/[slug]', locale: 'sq', params: { slug: 'bmw-320d-2019-prishtine-x1' }, search: '',
    });
    expect(matchPathname('https://levizz.com/de/fahrzeug/audi-a4')?.key).toBe('/vehicle/[slug]');
    expect(matchPathname('https://levizz.com/de/fahrzeug/audi-a4')?.locale).toBe('de');
    expect(matchPathname('/en/vehicle/audi-a4')?.params.slug).toBe('audi-a4');
  });

  it('unterscheidet /dashboard von /dashboard/listings', () => {
    expect(matchPathname('/paneli')?.key).toBe('/dashboard');
    expect(matchPathname('/paneli/shpalljet')?.key).toBe('/dashboard/listings');
    expect(matchPathname('/de/konto/anzeigen')?.key).toBe('/dashboard/listings');
    expect(matchPathname('/en/dashboard/listings')?.key).toBe('/dashboard/listings');
  });

  it('behaelt die Suchparameter', () => {
    const treffer = matchPathname('/kerko?make=bmw&fuel=DIESEL');
    expect(treffer?.key).toBe('/search');
    expect(treffer?.search).toBe('?make=bmw&fuel=DIESEL');
  });

  it('kennt die Startseite und Nachrichten', () => {
    expect(matchPathname('/')?.key).toBe('/');
    expect(matchPathname('https://levizz.com/en')?.key).toBe('/');
    expect(matchPathname('/mesazhet/abc123')).toEqual({ key: '/messages/[id]', locale: 'sq', params: { id: 'abc123' }, search: '' });
  });

  it('gibt bei Unbekanntem null zurueck, auch bei falscher Sprache', () => {
    expect(matchPathname('/gibt-es-nicht')).toBeNull();
    // Deutscher Pfad ohne /de-Praefix ist kein albanischer Pfad.
    expect(matchPathname('/fahrzeug/audi-a4')).toBeNull();
    expect(matchPathname('/de/vetura/audi-a4')).toBeNull();
  });

  it('dekodiert Segmente', () => {
    expect(matchPathname('/vetura/m%C3%ABrcedes-x')?.params.slug).toBe('mërcedes-x');
  });
});
