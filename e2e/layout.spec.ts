import { expect, test, type Page } from '@playwright/test';

/**
 * Nichts darf verrutschen, wenn ein Menü aufgeht.
 *
 * Der Test steht hier, weil genau das passierte: Die Bibliothek hinter den
 * Auswahlfeldern sperrt beim Öffnen das Scrollen, die Bildlaufleiste
 * verschwindet, und das Fenster wird schlagartig 15 Pixel breiter. Alles, was
 * fest in einer Ecke sitzt, sprang mit — bei jedem Klick auf Währung, Sprache
 * oder einen Filter.
 *
 * Warum nicht einfach vorher und nachher messen: In einem Browser ohne
 * Fenster liegt die Bildlaufleiste über dem Inhalt und nimmt keine Breite
 * weg. Der Fehler tritt dort gar nicht auf — eine Messung wäre auch ohne die
 * Korrektur grün und würde nichts sichern.
 *
 * Geprüft wird deshalb, dass die beiden Regeln wirken, die den Sprung
 * verhindern: der reservierte Platz für die Leiste und der zurückgenommene
 * Ausgleich der Bibliothek. Die Messung läuft zusätzlich mit; wo eine echte
 * Leiste vorhanden ist, greift sie.
 */
async function lage(page: Page) {
  return page.evaluate(() => {
    const container = document.querySelector('.lv-container');
    const fest = [...document.querySelectorAll('a')].find(
      (element) => getComputedStyle(element).position === 'fixed',
    );

    return {
      body: Math.round(document.body.getBoundingClientRect().width),
      container: container ? Math.round(container.getBoundingClientRect().width) : null,
      festeEcke: fest ? Math.round(fest.getBoundingClientRect().right) : null,
    };
  });
}

const regeln = (page: Page) =>
  page.evaluate(() => ({
    htmlGutter: getComputedStyle(document.documentElement).scrollbarGutter,
    bodyGutter: getComputedStyle(document.body).scrollbarGutter,
    bodyMarginRight: getComputedStyle(document.body).marginRight,
  }));

test.describe('Kein Springen beim Öffnen', () => {
  test('der Platz der Bildlaufleiste bleibt reserviert', async ({ page }) => {
    await page.goto('/');

    const vorher = await regeln(page);

    // Auf beiden Elementen: steht der Wert nur auf html, geht er verloren,
    // sobald der Ueberlauf von body auf das Fenster durchschlaegt.
    expect(vorher.htmlGutter).toBe('stable');
    expect(vorher.bodyGutter).toBe('stable');
  });

  test('ein Auswahlfeld verschiebt die Seite nicht', async ({ page }) => {
    await page.goto('/');

    const vorher = await lage(page);
    expect(vorher.container, 'die Seite hat einen messbaren Inhalt').toBeGreaterThan(0);

    await page.getByRole('button', { name: /Ndrysho valutën/i }).click();
    // Die Sperre ist der Ausloeser des Fehlers -- ohne sie prueft der Test nichts.
    await expect(page.locator('body[data-scroll-locked]')).toBeAttached();

    // Die Bibliothek gibt dem body sonst 15 Pixel Rand als Ausgleich. Zusammen
    // mit dem reservierten Platz waere das doppelt, und der Inhalt wuerde
    // schmaler -- der Sprung nur in die andere Richtung.
    expect((await regeln(page)).bodyMarginRight).toBe('0px');
    expect(await lage(page)).toEqual(vorher);
  });

  // Menue und Filterbereich sind erst unterhalb der grossen Breiten sichtbar:
  // am Schreibtisch stehen die Filter als Spalte daneben.
  test.describe('auf schmalen Fenstern', () => {
    test.use({ viewport: { width: 900, height: 800 } });

    test('das Menü verschiebt die Seite nicht', async ({ page }) => {
      await page.goto('/');

      const vorher = await lage(page);

      await page.getByRole('button', { name: /Hap menynë/i }).click();
      await expect(page.locator('body[data-scroll-locked]')).toBeAttached();

      expect((await regeln(page)).bodyMarginRight).toBe('0px');
      expect(await lage(page)).toEqual(vorher);
    });

    test('der Filterbereich verschiebt die Trefferliste nicht', async ({ page }) => {
      await page.goto('/kerko');

      const vorher = await lage(page);

      await page.getByRole('button', { name: /^Filtrat$/i }).click();
      await expect(page.locator('body[data-scroll-locked]')).toBeAttached();

      expect((await regeln(page)).bodyMarginRight).toBe('0px');
      expect(await lage(page)).toEqual(vorher);
    });
  });
});
