import { describe, expect, it } from 'vitest';

import { isBlockedAddress } from './remote-image';

describe('isBlockedAddress', () => {
  it('sperrt die Rueckschleife', () => {
    expect(isBlockedAddress('127.0.0.1')).toBe(true);
    expect(isBlockedAddress('127.1.2.3')).toBe(true);
    expect(isBlockedAddress('localhost')).toBe(true);
    expect(isBlockedAddress('app.localhost')).toBe(true);
    expect(isBlockedAddress('::1')).toBe(true);
  });

  it('sperrt private Netze', () => {
    expect(isBlockedAddress('10.0.0.5')).toBe(true);
    expect(isBlockedAddress('192.168.1.10')).toBe(true);
    expect(isBlockedAddress('172.16.0.1')).toBe(true);
    expect(isBlockedAddress('172.31.255.254')).toBe(true);
  });

  it('laesst Adressen knapp ausserhalb der privaten Bereiche durch', () => {
    // 172.15 und 172.32 gehoeren nicht dazu -- eine zu breite Sperre wuerde
    // echte Bildserver aussperren.
    expect(isBlockedAddress('172.15.0.1')).toBe(false);
    expect(isBlockedAddress('172.32.0.1')).toBe(false);
    expect(isBlockedAddress('11.0.0.1')).toBe(false);
  });

  it('sperrt den Metadatendienst der Rechenzentren', () => {
    // 169.254.169.254 gibt bei mehreren Anbietern Zugangsschluessel heraus.
    expect(isBlockedAddress('169.254.169.254')).toBe(true);
  });

  it('sperrt Nachbarn im Docker-Netz', () => {
    // "db" oder "app" sind keine Namen aus dem Netz, sondern Dienste daneben.
    expect(isBlockedAddress('db')).toBe(true);
    expect(isBlockedAddress('app')).toBe(true);
  });

  it('sperrt eingebettete IPv4-Adressen', () => {
    expect(isBlockedAddress('::ffff:127.0.0.1')).toBe(true);
    expect(isBlockedAddress('[::ffff:10.0.0.1]')).toBe(true);
  });

  it('sperrt eindeutig lokale IPv6-Bereiche', () => {
    expect(isBlockedAddress('fd00::1')).toBe(true);
    expect(isBlockedAddress('fe80::1')).toBe(true);
  });

  it('laesst oeffentliche Adressen durch', () => {
    expect(isBlockedAddress('bilder.beispiel.com')).toBe(false);
    expect(isBlockedAddress('93.184.216.34')).toBe(false);
    expect(isBlockedAddress('2606:2800:220:1:248:1893:25c8:1946')).toBe(false);
  });

  it('sperrt eine leere Angabe', () => {
    expect(isBlockedAddress('')).toBe(true);
  });
});
