import { describe, expect, it } from 'vitest';

import de from '@/messages/de.json';
import en from '@/messages/en.json';
import sq from '@/messages/sq.json';

import { BUG_KINDS, BUG_STATUSES, bugReportSchema, bugStatusSchema } from './schemas';

const gueltig = {
  kind: 'BUG' as const,
  message: 'Ich habe auf Speichern gedrueckt und die Seite blieb leer.',
  email: '',
  pageUrl: '',
};

describe('bugReportSchema', () => {
  it('nimmt eine brauchbare Meldung an', () => {
    expect(bugReportSchema.safeParse(gueltig).success).toBe(true);
  });

  it('weist eine zu knappe Beschreibung ab', () => {
    // "geht nicht" ist keine Meldung, mit der sich etwas nachstellen laesst.
    const result = bugReportSchema.safeParse({ ...gueltig, message: 'geht nicht' });
    expect(result.success).toBe(false);
  });

  it('begrenzt die Laenge nach oben', () => {
    const result = bugReportSchema.safeParse({ ...gueltig, message: 'a'.repeat(2001) });
    expect(result.success).toBe(false);
  });

  it('macht aus einem leeren E-Mail-Feld null', () => {
    // Die Adresse ist freiwillig; ein leerer Text waere kein fehlender Wert.
    const result = bugReportSchema.parse(gueltig);
    expect(result.email).toBeNull();
  });

  it('nimmt eine Adresse an und schreibt sie klein', () => {
    const result = bugReportSchema.parse({ ...gueltig, email: 'Melder@Example.ORG' });
    expect(result.email).toBe('melder@example.org');
  });

  it('weist eine unbrauchbare Adresse ab, statt sie zu verwerfen', () => {
    // Stillschweigend wegwerfen hiesse: der Melder wartet auf eine Antwort,
    // die nie kommt.
    const result = bugReportSchema.safeParse({ ...gueltig, email: 'kein-at-zeichen' });
    expect(result.success).toBe(false);
  });

  it('kennt nur die vorgesehenen Arten', () => {
    expect(bugReportSchema.safeParse({ ...gueltig, kind: 'SONSTWAS' }).success).toBe(false);
  });

  it('vertraegt seine eigene Ausgabe', () => {
    // Das Formular prueft im Browser und schickt das Ergebnis an den Server,
    // wo dasselbe Schema erneut greift. Aus dem leeren Feld ist dann `null`
    // geworden. Ohne diesen Fall schlaegt jede Meldung ohne E-Mail fehl --
    // und genau so ist es passiert.
    const einmal = bugReportSchema.parse(gueltig);
    const zweimal = bugReportSchema.safeParse(einmal);

    expect(zweimal.success).toBe(true);
    if (zweimal.success) expect(zweimal.data).toEqual(einmal);
  });

  it('schneidet Leerraum ab', () => {
    const result = bugReportSchema.parse({
      ...gueltig,
      message: '   ' + gueltig.message + '   ',
    });
    expect(result.message).toBe(gueltig.message);
  });
});

describe('bugStatusSchema', () => {
  it('nimmt jeden vorgesehenen Zustand an', () => {
    for (const status of BUG_STATUSES) {
      expect(bugStatusSchema.safeParse({ id: 'x', status }).success, status).toBe(true);
    }
  });

  it('weist einen erfundenen Zustand ab', () => {
    expect(bugStatusSchema.safeParse({ id: 'x', status: 'VIELLEICHT' }).success).toBe(false);
  });

  it('verlangt eine Kennung', () => {
    expect(bugStatusSchema.safeParse({ id: '', status: 'OPEN' }).success).toBe(false);
  });
});

describe('Uebersetzungen', () => {
  const SPRACHEN = [['sq', sq], ['de', de], ['en', en]] as const;

  it('jede Art ist in allen drei Sprachen benannt', () => {
    for (const [name, messages] of SPRACHEN) {
      const kinds = (messages.feedback as { kinds: Record<string, string> }).kinds;

      for (const kind of BUG_KINDS) {
        expect(kinds[kind], `${kind} fehlt in ${name}.json`).toBeTruthy();
      }
    }
  });

  it('jeder Bearbeitungsstand ist benannt und als Schaltflaeche beschriftet', () => {
    for (const [name, messages] of SPRACHEN) {
      // Eng gefasst: der Namensraum enthaelt neben diesen beiden auch
      // gewoehnliche Texte.
      const bugs = (
        messages.admin as unknown as {
          bugs: { status: Record<string, string>; setStatus: Record<string, string> };
        }
      ).bugs;

      for (const status of BUG_STATUSES) {
        expect(bugs.status[status], `status.${status} fehlt in ${name}`).toBeTruthy();
        expect(bugs.setStatus[status], `setStatus.${status} fehlt in ${name}`).toBeTruthy();
      }
    }
  });

  it('der Namensraum feedback ist ueberall gleich vollstaendig', () => {
    const keysOf = (value: unknown, prefix = ''): string[] =>
      Object.entries(value as Record<string, unknown>).flatMap(([key, entry]) =>
        entry !== null && typeof entry === 'object'
          ? keysOf(entry, `${prefix}${key}.`)
          : [`${prefix}${key}`],
      );

    const referenz = keysOf(sq.feedback).sort();
    expect(keysOf(de.feedback).sort()).toEqual(referenz);
    expect(keysOf(en.feedback).sort()).toEqual(referenz);
  });
});
