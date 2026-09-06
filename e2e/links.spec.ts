import { expect, test } from '@playwright/test';

/**
 * Kein Verweis auf der Startseite darf ins Leere führen.
 *
 * Der Test steht hier, weil genau das passiert ist: Der Knopf „Vlerëso
 * veturën" zeigte auf `/shit` — ein Pfad, der in der Routentabelle stand, aber
 * nie eine Seite bekommen hat. Jeder Klick landete auf der 404-Seite, und
 * auffallen konnte es niemandem: Der Übersetzer prüft, ob der Pfad in der
 * Tabelle steht, nicht, ob es dazu etwas zu sehen gibt.
 *
 * Geprüft wird nur „nicht 404". Eine Weiterleitung zur Anmeldung ist in
 * Ordnung — geschützte Seiten sollen genau das tun.
 */
test.describe('Verweise', () => {
  test('kein Verweis auf der Startseite fuehrt ins Leere', async ({ page }) => {
    await page.goto('/');

    const adressen = await page.locator('a[href^="/"]').evaluateAll((elemente) =>
      [
        ...new Set(
          elemente
            .map((element) => element.getAttribute('href') ?? '')
            // Sprungmarken und leere Ziele sind keine Seiten.
            .filter((href) => href.length > 1 && !href.startsWith('/#')),
        ),
      ].sort(),
    );

    expect(adressen.length, 'die Startseite verweist ueberhaupt irgendwohin').toBeGreaterThan(5);

    const tote: string[] = [];

    for (const adresse of adressen) {
      const antwort = await page.request.get(adresse, { maxRedirects: 0 });
      // 3xx ist in Ordnung: geschuetzte Seiten leiten zur Anmeldung.
      if (antwort.status() === 404) tote.push(adresse);
    }

    expect(tote, `tote Verweise: ${tote.join(', ')}`).toEqual([]);
  });

  test('kein Verweis in der Fusszeile fuehrt ins Leere', async ({ page }) => {
    await page.goto('/');

    const adressen = await page
      .locator('footer a[href^="/"]')
      .evaluateAll((elemente) => [
        ...new Set(elemente.map((element) => element.getAttribute('href') ?? '')),
      ]);

    const tote: string[] = [];

    for (const adresse of adressen.filter((href) => href.length > 1)) {
      const antwort = await page.request.get(adresse, { maxRedirects: 0 });
      if (antwort.status() === 404) tote.push(adresse);
    }

    expect(tote, `tote Verweise in der Fusszeile: ${tote.join(', ')}`).toEqual([]);
  });
});
