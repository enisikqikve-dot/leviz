import { describe, expect, it } from 'vitest';

import de from '../../messages/de.json';
import en from '../../messages/en.json';
import sq from '../../messages/sq.json';
import { locales } from './routing';

type Messages = Record<string, unknown>;

/** Sammelt alle Schlüsselpfade rekursiv, damit auch verschachtelte Ebenen zählen. */
function flatten(value: Messages, prefix = ''): string[] {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return child !== null && typeof child === 'object'
      ? flatten(child as Messages, path)
      : [path];
  });
}

const catalogues = { sq, de, en } as const;

describe('Übersetzungskataloge', () => {
  it('deckt jede konfigurierte Sprache ab', () => {
    expect(Object.keys(catalogues).sort()).toEqual([...locales].sort());
  });

  it.each(['de', 'en'] as const)(
    'hat in %s exakt dieselben Schlüssel wie in Albanisch',
    (locale) => {
      const reference = flatten(sq as Messages).sort();
      const compared = flatten(catalogues[locale] as Messages).sort();

      expect(compared.filter((k) => !reference.includes(k))).toEqual([]);
      expect(reference.filter((k) => !compared.includes(k))).toEqual([]);
    },
  );

  it.each(Object.entries(catalogues))('lässt in %s keinen Text leer', (_locale, messages) => {
    const empty: string[] = [];
    const walk = (value: Messages, prefix = '') => {
      for (const [key, child] of Object.entries(value)) {
        const path = prefix ? `${prefix}.${key}` : key;
        if (child !== null && typeof child === 'object') walk(child as Messages, path);
        else if (typeof child !== 'string' || child.trim() === '') empty.push(path);
      }
    };
    walk(messages as Messages);
    expect(empty).toEqual([]);
  });
});
