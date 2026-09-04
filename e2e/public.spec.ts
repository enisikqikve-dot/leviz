import { expect, test } from '@playwright/test';

import { firstListingHref } from './helpers';

/**
 * Die Seiten, die jeder ohne Anmeldung erreicht. Sie tragen das Portal — wenn
 * hier etwas bricht, sieht es jeder Besucher sofort.
 */

test.describe('Öffentliche Seiten', () => {
  test('die Startseite zeigt Fahrzeuge aus der Datenbank', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // Keine Platzhalterlisten: die Startseite lebt von echten Inseraten.
    await expect(page.locator('a[href*="/vetura/"]').first()).toBeVisible();
  });

  test('die Suche liefert Treffer und filtert', async ({ page }) => {
    await page.goto('/kerko');

    const unfiltered = page.locator('a[href*="/vetura/"]');
    await expect(unfiltered.first()).toBeVisible();
    const before = await unfiltered.count();

    await page.goto('/kerko?fuel=DIESEL&priceMax=6000');
    const after = await page.locator('a[href*="/vetura/"]').count();

    // Ein engerer Filter darf nie mehr Treffer liefern als gar keiner.
    expect(after).toBeLessThanOrEqual(before);
  });

  test('ein unsinniger Filterwert wirft die Suche nicht um', async ({ page }) => {
    // Die Filter stehen in der Adresszeile und sind damit frei manipulierbar.
    const response = await page.goto('/kerko?priceMax=abc&fuel=RAKETE&page=-5');

    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('die Fahrzeugseite zeigt Preis und regionale Angaben', async ({ page }) => {
    const href = await firstListingHref(page);
    await page.goto(href);

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Ein Betrag mit Währung, nicht bloß das Zeichen: das steht auch im
    // Währungsumschalter der Kopfzeile, der auf dem Telefon eingeklappt ist.
    await expect(
      page.locator('main').getByText(/\d[\d.,]*\s*€/).first(),
    ).toBeVisible();
  });

  test('die Fahrzeugseite antwortet in allen drei Sprachen', async ({ page }) => {
    const href = await firstListingHref(page);
    const slug = href.split('/').pop();

    for (const path of [`/vetura/${slug}`, `/de/fahrzeug/${slug}`, `/en/vehicle/${slug}`]) {
      const response = await page.goto(path);
      expect(response?.status(), `${path} antwortete nicht mit 200`).toBe(200);
    }
  });

  test('eine unbekannte Adresse führt auf die eigene 404-Seite', async ({ page }) => {
    const response = await page.goto('/vetura/gibt-es-nicht-xyz');
    expect(response?.status()).toBe(404);
  });

  test('die Preisseite listet die Pakete', async ({ page }) => {
    await page.goto('/cmimet');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText('Falas').first()).toBeVisible();
  });
});

test.describe('Suchmaschinen', () => {
  test('robots.txt sperrt die geschützten Bereiche', async ({ request }) => {
    const response = await request.get('/robots.txt');
    expect(response.status()).toBe(200);

    const body = await response.text();
    expect(body).toContain('Disallow: /admin');
    expect(body).toContain('Sitemap:');
  });

  test('die Sitemap führt Fahrzeuge mit ihren Sprachfassungen', async ({ request }) => {
    const response = await request.get('/sitemap.xml');
    expect(response.status()).toBe(200);

    const body = await response.text();
    expect(body).toContain('/vetura/');
    expect(body).toContain('hreflang="de"');
    expect(body).toContain('hreflang="en"');
  });

  test('jede Seite nennt ihre Sprachfassungen und die kanonische Adresse', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    // Drei Sprachen plus x-default.
    await expect(page.locator('link[rel="alternate"]')).toHaveCount(4);
  });
});

test.describe('Sicherheitskopfzeilen', () => {
  test('die Antwort trägt die erwarteten Kopfzeilen', async ({ request }) => {
    const response = await request.get('/');
    const headers = response.headers();

    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['permissions-policy']).toContain('camera=()');
  });

  test('die Technik hinter der Seite wird nicht verraten', async ({ request }) => {
    const response = await request.get('/');
    expect(response.headers()['x-powered-by']).toBeUndefined();
  });
});
