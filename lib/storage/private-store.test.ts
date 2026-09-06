import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { VERIFICATION_ROOT, buildDocumentKey, resolveDocumentPath } from './private-store';

const ROOT = path.join('/speicher', 'verification');

describe('VERIFICATION_ROOT', () => {
  it('liegt ausserhalb des oeffentlichen Verzeichnisses', () => {
    // Der eigentliche Schutz dieser Ablage. Laege sie unter public/, waere
    // jeder Ausweis mit seiner blossen Adresse abrufbar.
    expect(VERIFICATION_ROOT).not.toContain(`${path.sep}public${path.sep}`);
    expect(VERIFICATION_ROOT.endsWith(path.join('var', 'verification'))).toBe(true);
  });
});

describe('buildDocumentKey', () => {
  it('legt den Beleg in den Ordner des Antragstellers', () => {
    expect(buildDocumentKey('nutzer123', 'jpg')).toMatch(/^nutzer123\//);
  });

  it('behaelt die Endung', () => {
    expect(buildDocumentKey('x', 'pdf')).toMatch(/\.pdf$/);
  });

  it('erzeugt keinen Schluessel zweimal', () => {
    const schluessel = new Set(
      Array.from({ length: 500 }, () => buildDocumentKey('gleicher-nutzer', 'jpg')),
    );

    expect(schluessel.size).toBe(500);
  });
});

describe('resolveDocumentPath', () => {
  it('loest einen gewoehnlichen Schluessel unterhalb der Wurzel auf', () => {
    expect(resolveDocumentPath('nutzer1/abc.jpg', ROOT)).toBe(
      path.resolve(ROOT, 'nutzer1', 'abc.jpg'),
    );
  });

  it('laesst nichts ausserhalb der Wurzel lesen', () => {
    expect(resolveDocumentPath('../../.env', ROOT)).toBeNull();
    expect(resolveDocumentPath('nutzer1/../../../etc/passwd', ROOT)).toBeNull();
  });

  it('weist Leeres und Nullbytes ab', () => {
    expect(resolveDocumentPath('', ROOT)).toBeNull();
    expect(resolveDocumentPath('nutzer1/a.jpg\0.html', ROOT)).toBeNull();
  });
});
