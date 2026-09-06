import { expect, test } from '@playwright/test';

/**
 * Die Wertschätzung antwortet auf jede vollständige Eingabe — entweder mit
 * einer Spanne oder mit dem Satz, dass es dafür noch zu wenige vergleichbare
 * Fahrzeuge gibt.
 *
 * Beides ist ein gültiges Ergebnis. Was nicht vorkommen darf, ist ein Formular,
 * das auf den Knopf hin gar nichts tut.
 */
test.describe('Wertschätzung', () => {
  test('ohne Anmeldung erreichbar und mit einer Antwort', async ({ page }) => {
    await page.goto('/vleresim');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Marke wählen, dann das erste Modell dieser Marke.
    await page.getByRole('combobox').first().click();
    await page.getByRole('option').first().click();

    const modell = page.getByRole('combobox').nth(1);
    await expect(modell).toBeEnabled({ timeout: 15_000 });
    await modell.click();
    await page.getByRole('option').first().click();

    await page.getByLabel(/Viti i prodhimit/i).fill('2016');
    await page.getByLabel(/Kilometrazhi/i).fill('140000');

    await page.getByRole('button', { name: /Vlerëso veturën/i }).click();

    // role="status" tragen beide Ausgänge: die Schätzung und der Hinweis.
    await expect(page.getByRole('status').first()).toBeVisible({ timeout: 20_000 });
  });

  test('eine unvollstaendige Eingabe wird im Formular gemeldet', async ({ page }) => {
    await page.goto('/vleresim');

    await page.getByRole('button', { name: /Vlerëso veturën/i }).click();

    // Kein Absturz, kein stilles Nichts: die fehlenden Felder werden benannt.
    await expect(page.getByText(/Zgjidh markën/i)).toBeVisible({ timeout: 15_000 });
  });
});
