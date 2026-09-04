import { describe, expect, it } from 'vitest';

import { MAX_COMPARE, parseCompare, serializeCompare, toggleCompare } from './store';

describe('Vergleichsauswahl', () => {
  it('liest eine leere Auswahl als leere Liste', () => {
    expect(parseCompare(undefined)).toEqual([]);
    expect(parseCompare('')).toEqual([]);
  });

  it('liest Kennungen aus dem Cookie', () => {
    expect(parseCompare('abc123,def456')).toEqual(['abc123', 'def456']);
  });

  it('verwirft unbrauchbare Werte aus dem Cookie', () => {
    // Das Cookie ist vom Nutzer veraenderbar und darf nichts durchreichen.
    expect(parseCompare('abc123,<script>,def456')).toEqual(['abc123', 'def456']);
    expect(parseCompare("'; DROP TABLE")).toEqual([]);
  });

  it('begrenzt die Auswahl beim Lesen', () => {
    expect(parseCompare('a,b,c,d,e,f')).toHaveLength(MAX_COMPARE);
  });

  it('nimmt ein Fahrzeug auf und wieder heraus', () => {
    const added = toggleCompare([], 'abc');
    expect(added).toEqual({ ids: ['abc'], selected: true, full: false });

    const removed = toggleCompare(['abc', 'def'], 'abc');
    expect(removed).toEqual({ ids: ['def'], selected: false, full: false });
  });

  it('meldet eine volle Auswahl, statt still zu verwerfen', () => {
    const full = toggleCompare(['a', 'b', 'c', 'd'], 'e');
    expect(full.full).toBe(true);
    expect(full.ids).toEqual(['a', 'b', 'c', 'd']);
  });

  it('laesst ein Entfernen auch bei voller Auswahl zu', () => {
    const result = toggleCompare(['a', 'b', 'c', 'd'], 'b');
    expect(result.full).toBe(false);
    expect(result.ids).toEqual(['a', 'c', 'd']);
  });

  it('schreibt ohne Dubletten und innerhalb der Grenze', () => {
    expect(serializeCompare(['a', 'a', 'b'])).toBe('a,b');
    expect(serializeCompare(['a', 'b', 'c', 'd', 'e']).split(',')).toHaveLength(MAX_COMPARE);
  });
});
