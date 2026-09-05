import { describe, expect, it } from 'vitest';

import { isLocalDatabase, mayWriteDemoContent, OVERRIDE } from './guard';

const LOKAL = 'postgresql://leviz:pw@127.0.0.1:5433/leviz?schema=public';
const SUPABASE =
  'postgresql://postgres.abc:pw@aws-0-eu-central-1.pooler.supabase.com:6543/postgres';

describe('isLocalDatabase', () => {
  it('erkennt den eigenen Rechner', () => {
    for (const url of [
      LOKAL,
      'postgresql://u:p@localhost:5432/db',
      'postgresql://u:p@[::1]:5432/db',
    ]) {
      expect(isLocalDatabase(url), url).toBe(true);
    }
  });

  it('erkennt eine fremde Datenbank', () => {
    for (const url of [
      SUPABASE,
      'postgresql://u:p@db.example.com:5432/db',
      'postgresql://u:p@10.0.0.5:5432/db',
    ]) {
      expect(isLocalDatabase(url), url).toBe(false);
    }
  });

  it('haelt eine unlesbare oder fehlende Adresse fuer nicht lokal', () => {
    // Im Zweifel abbrechen: lieber ein Seed zu wenig als eine geleerte
    // fremde Datenbank.
    expect(isLocalDatabase(undefined)).toBe(false);
    expect(isLocalDatabase('')).toBe(false);
    expect(isLocalDatabase('kein-url')).toBe(false);
  });

  it('laesst sich nicht von einem lokalen Namen im Passwort taeuschen', () => {
    // Der Rechnername steht hinter dem @, nicht davor.
    expect(isLocalDatabase('postgresql://localhost:localhost@db.example.com:5432/x')).toBe(
      false,
    );
  });
});

describe('mayWriteDemoContent', () => {
  it('erlaubt den Seed gegen die Entwicklungsdatenbank', () => {
    expect(mayWriteDemoContent({ DATABASE_URL: LOKAL }).allowed).toBe(true);
  });

  it('verweigert ihn gegen eine fremde Datenbank', () => {
    const result = mayWriteDemoContent({ DATABASE_URL: SUPABASE });

    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      // Die Meldung muss sagen, wohin es ging und was stattdessen zu tun ist.
      expect(result.reason).toContain('supabase.com');
      expect(result.reason).toContain('db:catalog');
    }
  });

  it('laesst sich bewusst uebersteuern', () => {
    const result = mayWriteDemoContent({ DATABASE_URL: SUPABASE, [OVERRIDE]: '1' });
    expect(result.allowed).toBe(true);
  });

  it('reagiert nur auf genau den Wert 1', () => {
    // Ein versehentlich gesetztes "false" oder "0" darf nicht oeffnen.
    for (const value of ['0', 'false', 'true', 'ja', '']) {
      const result = mayWriteDemoContent({ DATABASE_URL: SUPABASE, [OVERRIDE]: value });
      expect(result.allowed, `Wert ${JSON.stringify(value)}`).toBe(false);
    }
  });

  it('verweigert ihn auch ohne gesetzte DATABASE_URL', () => {
    expect(mayWriteDemoContent({}).allowed).toBe(false);
  });
});
