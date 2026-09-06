import { expect, test } from '@playwright/test';

import { ACCOUNTS, login } from './helpers';

/**
 * Ein hochgeladenes Foto muss sofort zu sehen sein.
 *
 * Der Test steht hier, weil genau das einmal nicht so war: Next liest das
 * Verzeichnis mit den oeffentlichen Dateien im Betrieb nur beim Start ein.
 * Alles, was ein Verkaeufer danach hochlud, kam mit 404 zurueck — die Fotos
 * jedes neuen Inserats blieben leer, bis jemand den Server neu startete.
 *
 * Auffallen konnte das nur hier: die Unit-Tests kennen keinen Server, und der
 * Entwicklungsserver liest das Verzeichnis bei jeder Anfrage neu. Playwright
 * laeuft gegen einen Produktionsbau und legt die Datei nach dessen Start an —
 * damit trifft er den Fall.
 *
 * Deshalb reicht es auch nicht, das Bildelement im Seitenaufbau zu finden.
 * Ein `img` mit toter Adresse steht genauso da; geprueft wird, dass der Server
 * die Datei tatsaechlich herausgibt und der Browser sie darstellen kann.
 */

/** Ein winziges, gueltiges JPEG — 64x48, einfarbig. */
const JPEG_BASE64 =
  '/9j/2wBDAA0JCgsKCA0LCgsODg0PEyAVExISEyccHhcgLikxMC4pLSwzOko+MzZGNywtQFdBRkxOUlNSMj5aYVpQYEpRUk//2' +
  'wBDAQ4ODhMREyYVFSZPNS01T09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0//wAARC' +
  'AAwAEADASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFgEBAQEAAAAAA' +
  'AAAAAAAAAAAAAUG/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AnwGhTAAAAAAAAAAAAAAAAAAAAAAH/9k=';

test.describe('Hochgeladene Fotos', () => {
  test('ein soeben hochgeladenes Foto wird auch ausgeliefert', async ({ page }) => {
    await login(page, ACCOUNTS.seller);

    await page.goto('/shit/krijo');

    // Direkt zum Schritt mit den Fotos; die uebrigen Angaben braucht der
    // Upload nicht, er legt die Datei sofort ab.
    await page.getByRole('button', { name: /Fotot/ }).click();

    await page.locator('input[type="file"]').setInputFiles({
      name: 'test-foto.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from(JPEG_BASE64, 'base64'),
    });

    // Nach dem Upload steht die Vorschau da — als next/image, also ueber den
    // Bild-Optimierer und mit der Adresse der abgelegten Datei darin.
    const preview = page.locator('img[src*="uploads"]').first();
    await expect(preview).toBeVisible({ timeout: 30_000 });

    const optimized = (await preview.getAttribute('src')) ?? '';
    const stored = new URL(optimized, page.url()).searchParams.get('url');
    expect(stored, 'die Vorschau zeigt auf eine abgelegte Datei').toMatch(/^\/uploads\//);

    const direct = await page.request.get(stored as string);
    expect(direct.status(), `die Datei selbst unter ${stored}`).toBe(200);
    expect(direct.headers()['content-type']).toContain('image/');

    const optimizedResponse = await page.request.get(optimized);
    expect(optimizedResponse.status(), 'dasselbe Bild ueber den Bild-Optimierer').toBe(200);

    // Und der Browser bekommt es wirklich gezeichnet: ein Bild mit toter
    // Adresse hat die Breite 0.
    await expect
      .poll(() => preview.evaluate((element: HTMLImageElement) => element.naturalWidth), {
        timeout: 15_000,
      })
      .toBeGreaterThan(0);

    // Nicht gebrauchte Datei wieder wegraeumen.
    await page.getByRole('button', { name: 'Fshij' }).first().click();
    await expect(preview).toBeHidden();
  });

  test('ein Ausbruch aus dem Bilderverzeichnis wird abgewiesen', async ({ page }) => {
    for (const path of [
      '/uploads/../../package.json',
      '/uploads/..%2f..%2fpackage.json',
      '/uploads/vehicles/irgendwas.html',
      '/uploads/vehicles/gibt-es-nicht.jpg',
    ]) {
      const response = await page.request.get(path, { maxRedirects: 0 });
      expect(response.status(), path).toBe(404);
    }
  });
});
