import { expect, test } from '@playwright/test';

import { DEMO_PASSWORD } from './helpers';

/**
 * Ein Autohaus muss sich selbst anlegen können.
 *
 * Vorher ging das nicht: Die Registrierung erzeugte immer ein Privatkonto,
 * und ein Händlerprofil entstand ausschliesslich im Beispieldaten-Import. Der
 * ganze Händlerteil — Verzeichnis, eigene Seite, Prüfabzeichen, Händlerpakete
 * — war für echte Nutzer unerreichbar.
 */
const kennung = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

test.describe('Registrierung', () => {
  test('ein Autohaus legt ein Händlerkonto an', async ({ page }) => {
    const id = kennung();

    await page.goto('/regjistrohu');

    // Privat ist die Vorauswahl; die Firmenfelder erscheinen erst nach der Wahl.
    await expect(page.getByLabel(/Emri i biznesit/i)).toBeHidden();

    await page.getByRole('button', { name: /^Autosallon$/i }).click();

    await page.getByLabel(/Emri i biznesit/i).fill(`Auto Test ${id}`);
    await page.getByLabel(/Numri i biznesit/i).fill('811234567');
    await page.getByLabel(/Personi kontaktues/i).fill('Arben Krasniqi');
    await page.getByLabel(/^Email$/i).fill(`autosallon-${id}@leviz.invalid`);
    await page.getByLabel(/^Fjalëkalimi$/i).fill(DEMO_PASSWORD);
    await page.getByLabel(/Përsërit fjalëkalimin/i).fill(DEMO_PASSWORD);
    await page.getByRole('checkbox').check();

    await page.getByRole('button', { name: /Krijo llogari biznesi/i }).click();

    // Ein Händler landet auf der Prüfung, und zwar auf ihrer Händlerfassung:
    // vier Belege statt zwei. Das beweist, dass das Händlerprofil wirklich
    // angelegt wurde — ohne es stünde hier das Formular für Privatpersonen.
    await expect(page.getByText(/Për autosallonet verifikimi është i detyrueshëm/i)).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(/Certifikata e biznesit/i)).toBeVisible();
    await expect(page.getByText(/Dëshmi e adresës/i)).toBeVisible();
  });

  test('ohne Firmenangaben entsteht kein Händlerkonto', async ({ page }) => {
    const id = kennung();

    await page.goto('/regjistrohu');
    await page.getByRole('button', { name: /^Autosallon$/i }).click();

    await page.getByLabel(/Personi kontaktues/i).fill('Arben Krasniqi');
    await page.getByLabel(/^Email$/i).fill(`unvollstaendig-${id}@leviz.invalid`);
    await page.getByLabel(/^Fjalëkalimi$/i).fill(DEMO_PASSWORD);
    await page.getByLabel(/Përsërit fjalëkalimin/i).fill(DEMO_PASSWORD);
    await page.getByRole('checkbox').check();

    await page.getByRole('button', { name: /Krijo llogari biznesi/i }).click();

    await expect(page.getByText(/Shkruaj emrin e biznesit/i)).toBeVisible({ timeout: 15_000 });
  });

  test('ein Privatkonto fragt nicht nach einer Firma', async ({ page }) => {
    const id = kennung();

    await page.goto('/regjistrohu');

    await page.getByLabel(/Emri dhe mbiemri/i).fill('Privat Test');
    await page.getByLabel(/^Email$/i).fill(`privat-${id}@leviz.invalid`);
    await page.getByLabel(/^Fjalëkalimi$/i).fill(DEMO_PASSWORD);
    await page.getByLabel(/Përsërit fjalëkalimin/i).fill(DEMO_PASSWORD);
    await page.getByRole('checkbox').check();

    await page.getByRole('button', { name: /^Krijo llogari$/i }).click();

    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Përshëndetje/i, {
      timeout: 30_000,
    });
  });
});
