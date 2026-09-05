import { describe, expect, it } from 'vitest';

import de from '@/messages/de.json';
import en from '@/messages/en.json';
import sq from '@/messages/sq.json';

import { groupParagraphs } from './components/legal-page';
import { isLegalEntityComplete, missingLegalFields, type LegalEntity } from '@/lib/legal';

const DOKUMENTE = ['terms', 'withdrawal', 'privacy', 'cookies', 'imprint', 'contact'] as const;
const SPRACHEN = [['sq', sq], ['de', de], ['en', en]] as const;

type Doc = { title: string; intro: string; sections: { heading: string; body: string[] }[] };

const doc = (messages: (typeof SPRACHEN)[number][1], name: string): Doc =>
  (messages.legal as unknown as Record<string, Doc>)[name];

describe('Rechtstexte', () => {
  it('jedes Dokument gibt es in allen drei Sprachen', () => {
    for (const [name, messages] of SPRACHEN) {
      for (const kind of DOKUMENTE) {
        expect(doc(messages, kind), `${kind} fehlt in ${name}.json`).toBeTruthy();
      }
    }
  });

  it('kein Dokument ist leer', () => {
    for (const [name, messages] of SPRACHEN) {
      for (const kind of DOKUMENTE) {
        const entry = doc(messages, kind);

        expect(entry.title.trim(), `${kind}.title leer in ${name}`).not.toBe('');
        expect(entry.intro.trim(), `${kind}.intro leer in ${name}`).not.toBe('');
        expect(entry.sections.length, `${kind} ohne Abschnitte in ${name}`).toBeGreaterThan(0);

        for (const section of entry.sections) {
          expect(section.heading.trim(), `Abschnitt ohne Ueberschrift in ${name}/${kind}`)
            .not.toBe('');
          expect(section.body.length, `${section.heading} ohne Text in ${name}/${kind}`)
            .toBeGreaterThan(0);
        }
      }
    }
  });

  it('alle Sprachen haben gleich viele Abschnitte je Dokument', () => {
    // Eine fehlende Klausel in einer Sprache waere eine andere Rechtslage
    // fuer diese Leser.
    for (const kind of DOKUMENTE) {
      const referenz = doc(sq, kind).sections.length;

      expect(doc(de, kind).sections.length, `${kind}: de weicht ab`).toBe(referenz);
      expect(doc(en, kind).sections.length, `${kind}: en weicht ab`).toBe(referenz);
    }
  });

  it('nennt in jeder Sprache, dass der Text anwaltlich zu pruefen ist', () => {
    for (const [name, messages] of SPRACHEN) {
      const note = (messages.legal as unknown as { reviewNote: string }).reviewNote;
      expect(note?.trim(), `reviewNote fehlt in ${name}`).toBeTruthy();
    }
  });
});

describe('groupParagraphs', () => {
  it('fasst aufeinanderfolgende Aufzaehlungszeilen zu einer Liste', () => {
    const blocks = groupParagraphs(['Untersagt sind:', '· eins', '· zwei', 'Nachsatz.']);

    expect(blocks).toEqual([
      { kind: 'paragraph', text: 'Untersagt sind:' },
      { kind: 'list', items: ['eins', 'zwei'] },
      { kind: 'paragraph', text: 'Nachsatz.' },
    ]);
  });

  it('trennt zwei Aufzaehlungen, die ein Absatz unterbricht', () => {
    const blocks = groupParagraphs(['· a', 'dazwischen', '· b']);

    expect(blocks.filter((block) => block.kind === 'list')).toHaveLength(2);
  });

  it('laesst reine Absaetze unveraendert', () => {
    expect(groupParagraphs(['nur Text'])).toEqual([{ kind: 'paragraph', text: 'nur Text' }]);
  });
});

describe('Betreiberangaben', () => {
  const vollstaendig: LegalEntity = {
    name: 'LEVIZ', legalForm: 'SH.P.K.', street: 'Rr. Dëshmorët e Kombit 1',
    postalCode: '10000', city: 'Prishtinë', country: 'Kosova',
    registrationNumber: '810000000', taxNumber: '600000000', vatNumber: '',
    representative: 'Enis Kqiku', email: 'kontakt@example.org', phone: '+383 44 000 000',
  };

  it('erkennt vollstaendige Angaben, auch ohne Mehrwertsteuernummer', () => {
    // Nicht jedes Unternehmen hat eine — sie darf nicht blockieren.
    expect(isLegalEntityComplete(vollstaendig)).toBe(true);
  });

  it('nennt jedes fehlende Pflichtfeld beim Namen', () => {
    const missing = missingLegalFields({ ...vollstaendig, name: '', city: '   ' });

    expect(missing).toContain('name');
    expect(missing).toContain('city');
    expect(missing).not.toContain('taxNumber');
  });

  it('meldet eine leere Vorlage als unvollstaendig', () => {
    // Solange niemand echte Daten eingetragen hat, muss die Seite das sagen
    // statt ein vollstaendiges Impressum vorzutaeuschen.
    const leer = Object.fromEntries(
      Object.keys(vollstaendig).map((key) => [key, '']),
    ) as LegalEntity;

    expect(isLegalEntityComplete(leer)).toBe(false);
    expect(missingLegalFields(leer)).toContain('name');
  });

  it('die hinterlegten Angaben sind vollstaendig', () => {
    // Faengt ab, dass jemand das Impressum spaeter versehentlich leert. Ohne
    // vollstaendige Angaben schaltet kein Zahlungsdienstleister frei.
    expect(missingLegalFields()).toEqual([]);
  });
});
