import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { resolveUpload, UPLOADS_ROOT } from './serve';

const ROOT = path.join('/speicher', 'uploads');

describe('resolveUpload', () => {
  it('bildet einen gewoehnlichen Schluessel auf eine Datei unter der Wurzel ab', () => {
    const result = resolveUpload(['vehicles', 'nutzer1', 'abc-123.jpg'], ROOT);

    expect(result?.contentType).toBe('image/jpeg');
    expect(result?.filePath).toBe(path.resolve(ROOT, 'vehicles', 'nutzer1', 'abc-123.jpg'));
  });

  it('kennt die vier erlaubten Formate', () => {
    expect(resolveUpload(['a.png'], ROOT)?.contentType).toBe('image/png');
    expect(resolveUpload(['a.webp'], ROOT)?.contentType).toBe('image/webp');
    expect(resolveUpload(['a.avif'], ROOT)?.contentType).toBe('image/avif');
    expect(resolveUpload(['a.JPG'], ROOT)?.contentType).toBe('image/jpeg');
  });

  it('laesst nichts ausserhalb der Wurzel lesen', () => {
    expect(resolveUpload(['..', '..', 'geheim.jpg'], ROOT)).toBeNull();
    expect(resolveUpload(['vehicles', '..', '..', '..', 'env.jpg'], ROOT)).toBeNull();
  });

  it('liefert nichts fuer die Wurzel selbst', () => {
    expect(resolveUpload([], ROOT)).toBeNull();
    expect(resolveUpload(['.'], ROOT)).toBeNull();
  });

  it('weist Endungen ab, die der Browser ausfuehren wuerde', () => {
    // .svg fehlt bewusst: eine SVG-Datei darf Skripte enthalten, und sie liegt
    // unter derselben Herkunft wie die Anwendung.
    expect(resolveUpload(['boese.html'], ROOT)).toBeNull();
    expect(resolveUpload(['boese.svg'], ROOT)).toBeNull();
    expect(resolveUpload(['ohne-endung'], ROOT)).toBeNull();
  });

  it('weist leere Teile und Nullbytes ab', () => {
    expect(resolveUpload(['vehicles', '', 'a.jpg'], ROOT)).toBeNull();
    expect(resolveUpload(['a.jpg\0.html'], ROOT)).toBeNull();
  });

  it('zeigt standardmaessig auf public/uploads', () => {
    expect(UPLOADS_ROOT.endsWith(path.join('public', 'uploads'))).toBe(true);
  });
});
