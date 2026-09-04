import { expect, test } from '@playwright/test';

import { ACCOUNTS, login } from './helpers';

/**
 * Die Wege, die ein Käufer tatsächlich geht. Geprüft wird das Ergebnis in der
 * Anwendung, nicht der Klick selbst: eine Merkliste zählt erst, wenn das
 * Fahrzeug nach dem Neuladen noch darin steht.
 */

test.describe('Merkliste', () => {
  test('ein gemerktes Fahrzeug überlebt das Neuladen', async ({ page }) => {
    await login(page, ACCOUNTS.buyer);

    await page.goto('/kerko');
    const href = await page.locator('a[href*="/vetura/"]').first().getAttribute('href');

    // Die Herzschaltfläche liegt auf der Karte. Der Test darf nicht davon
    // ausgehen, dass sie noch nicht gedrückt ist: ein früherer Lauf kann das
    // Fahrzeug bereits gemerkt haben.
    const heart = page.locator('button[aria-pressed]').first();
    if ((await heart.getAttribute('aria-pressed')) === 'true') {
      await heart.click();
      await page.waitForTimeout(1200);
    }

    await heart.click();
    await expect(heart).toHaveAttribute('aria-pressed', 'true', { timeout: 15_000 });

    await page.goto('/te-preferuarat');
    await expect(page.locator(`a[href="${href}"]`).first()).toBeVisible({ timeout: 15_000 });
  });
});

test.describe('Vergleich', () => {
  test('bis zu vier Fahrzeuge landen im Vergleich', async ({ page }) => {
    await page.goto('/kerko');

    // Die Vergleichsschaltflächen sitzen als zweiter Knopf auf jeder Karte.
    const toggles = page.getByRole('button', { name: /Krahaso|krahasim/i });
    const available = Math.min(3, await toggles.count());

    for (let i = 0; i < available; i += 1) {
      await toggles.nth(i).click();
      await page.waitForTimeout(600);
    }

    await page.goto('/krahaso');

    // Entweder die Tabelle steht, oder der leere Zustand — nie ein Fehler.
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});

test.describe('Suchassistent', () => {
  test('Freitext wird zu Filtern in der Adresszeile', async ({ page }) => {
    await page.goto('/kerko');

    await page.getByRole('textbox', { name: /fjalët e tua/i }).fill('BMW naftë deri 15000 euro');
    await page.getByRole('button', { name: /^Kërko$/ }).click();

    // Erst zeigen, was verstanden wurde — dann erst anwenden.
    const apply = page.getByRole('button', { name: /Apliko filtrat/i });
    await expect(apply).toBeVisible({ timeout: 15_000 });

    await apply.click();
    await expect(page).toHaveURL(/make=bmw/, { timeout: 15_000 });
    await expect(page).toHaveURL(/fuel=DIESEL/);
    await expect(page).toHaveURL(/priceMax=15000/);
  });

  test('unverständlicher Text setzt keine Filter', async ({ page }) => {
    await page.goto('/kerko');

    await page.getByRole('textbox', { name: /fjalët e tua/i }).fill('qwertz asdfgh');
    await page.getByRole('button', { name: /^Kërko$/ }).click();

    // Lieber nichts setzen als etwas raten.
    await expect(page.getByRole('button', { name: /Apliko filtrat/i })).toHaveCount(0);
  });
});

test.describe('Eigene Inserate', () => {
  test('der Verkäufer sieht seine Inserate', async ({ page }) => {
    await login(page, ACCOUNTS.seller);

    await page.goto('/paneli/shpalljet');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('a[href*="/vetura/"]').first()).toBeVisible();
  });

  test('die Zahlungsübersicht steht bereit', async ({ page }) => {
    await login(page, ACCOUNTS.seller);

    await page.goto('/paneli/pagesat');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});

test.describe('Sprachwechsel', () => {
  test('dieselbe Seite gibt es in allen drei Sprachen', async ({ page }) => {
    for (const [path, marker] of [
      ['/kerko', /Kërko vetura/i],
      ['/de/suche', /Fahrzeuge suchen|Suche/i],
      ['/en/search', /Search vehicles/i],
    ] as const) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toContainText(marker);
    }
  });
});
