import { describe, expect, it } from 'vitest';

import de from '@/messages/de.json';
import en from '@/messages/en.json';
import sq from '@/messages/sq.json';

import { changePasswordSchema, profileSchema } from './schemas';

const gueltigesProfil = {
  name: 'Enis Kqiku',
  phone: '',
  citySlug: 'prizren',
  locale: 'sq' as const,
};

describe('profileSchema', () => {
  it('macht aus einem leeren Telefonfeld null', () => {
    // Die Spalte ist eindeutig. Zwei Konten mit leerem Text liessen sich nicht
    // speichern, zwei mit null schon.
    const result = profileSchema.parse(gueltigesProfil);
    expect(result.phone).toBeNull();
  });

  it('bringt eine Nummer in die einheitliche Schreibweise', () => {
    const result = profileSchema.parse({ ...gueltigesProfil, phone: '044 123 456' });
    expect(result.phone).toBe('+38344123456');
  });

  it('vertraegt seine eigene Ausgabe', () => {
    // Derselbe Fall wie bei den Fehlermeldungen: das Formular schickt sein
    // bereits geprueftes Ergebnis an den Server. Ohne diesen Fall koennte
    // niemand sein Profil speichern, der keine Telefonnummer hinterlegt.
    for (const phone of ['', '044 123 456']) {
      const einmal = profileSchema.parse({ ...gueltigesProfil, phone });
      const zweimal = profileSchema.safeParse(einmal);

      expect(zweimal.success, 'Telefon ' + JSON.stringify(phone)).toBe(true);
      if (zweimal.success) expect(zweimal.data).toEqual(einmal);
    }
  });

  it('weist eine unbrauchbare Nummer zurueck', () => {
    const result = profileSchema.safeParse({ ...gueltigesProfil, phone: 'ruf mich an' });
    expect(result.success).toBe(false);
  });

  it('verlangt einen Namen', () => {
    const result = profileSchema.safeParse({ ...gueltigesProfil, name: 'E' });
    expect(result.success).toBe(false);
  });

  it('laesst den Wohnort weg', () => {
    // Niemand muss seine Stadt angeben, um das Profil zu speichern.
    const result = profileSchema.safeParse({ ...gueltigesProfil, citySlug: '' });
    expect(result.success).toBe(true);
  });

  it('kennt nur die drei Sprachen der Seite', () => {
    const result = profileSchema.safeParse({ ...gueltigesProfil, locale: 'fr' });
    expect(result.success).toBe(false);
  });
});

describe('changePasswordSchema', () => {
  const gueltig = {
    currentPassword: 'AltesPasswort1',
    password: 'NeuesPasswort2',
    confirmPassword: 'NeuesPasswort2',
  };

  it('nimmt eine vollstaendige Eingabe an', () => {
    expect(changePasswordSchema.safeParse(gueltig).success).toBe(true);
  });

  it('meldet zwei verschiedene Wiederholungen am richtigen Feld', () => {
    const result = changePasswordSchema.safeParse({ ...gueltig, confirmPassword: 'x' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['confirmPassword']);
    }
  });

  it('verhindert, dass das neue dem alten Passwort entspricht', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'GleichesPasswort1',
      password: 'GleichesPasswort1',
      confirmPassword: 'GleichesPasswort1',
    });

    expect(result.success).toBe(false);
  });

  it('prueft das alte Passwort nicht auf Staerke', () => {
    // Wer sein Passwort vor einer Regelverschaerfung gesetzt hat, muss es
    // trotzdem eingeben koennen, um ein neues zu vergeben.
    const result = changePasswordSchema.safeParse({ ...gueltig, currentPassword: 'x' });
    expect(result.success).toBe(true);
  });

  it('verlangt Mindestlaenge, Buchstabe und Ziffer beim neuen Passwort', () => {
    for (const schwach of ['kurz1', 'nurbuchstaben', '12345678']) {
      const result = changePasswordSchema.safeParse({
        ...gueltig,
        password: schwach,
        confirmPassword: schwach,
      });
      expect(result.success, `${schwach} haette abgelehnt werden muessen`).toBe(false);
    }
  });
});

describe('Uebersetzungen', () => {
  it('jede Fehlermeldung der Aktionen steht in allen drei Sprachen', () => {
    // Die Aktionen geben nur Schluessel zurueck. Fehlt einer, stuende der
    // rohe Schluessel auf der Seite.
    const keys = [
      'errorCurrentPassword',
      'errorPhoneTaken',
      'errorNoPassword',
      'errorTooManyAttempts',
    ] as const;

    for (const [name, messages] of [['sq', sq], ['de', de], ['en', en]] as const) {
      for (const key of keys) {
        // Record<string, unknown>, weil der Namensraum auch verschachtelte
        // Eintraege enthaelt (languages).
        const text = (messages.account as Record<string, unknown>)[key];
        expect(text, `${key} fehlt in ${name}.json`).toBeTypeOf('string');
        expect(text, `${key} ist leer in ${name}.json`).toBeTruthy();
      }
    }
  });

  it('der Namensraum account ist in allen Sprachen gleich vollstaendig', () => {
    const keysOf = (value: unknown, prefix = ''): string[] =>
      Object.entries(value as Record<string, unknown>).flatMap(([key, entry]) =>
        entry !== null && typeof entry === 'object'
          ? keysOf(entry, `${prefix}${key}.`)
          : [`${prefix}${key}`],
      );

    const referenz = keysOf(sq.account).sort();
    expect(keysOf(de.account).sort()).toEqual(referenz);
    expect(keysOf(en.account).sort()).toEqual(referenz);
  });
});
