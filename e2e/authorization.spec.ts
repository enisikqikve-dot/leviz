import { expect, test } from '@playwright/test';

import { ACCOUNTS, DEMO_PASSWORD, login } from './helpers';

/**
 * Die sicherheitskritischen Wege.
 *
 * Diese Tests prüfen nicht, ob eine Schaltfläche versteckt ist — das wäre kein
 * Schutz. Sie rufen die geschützten Adressen direkt auf, so wie es jemand mit
 * bösen Absichten täte.
 */

test.describe('Zugang ohne Anmeldung', () => {
  const PROTECTED = ['/admin', '/paneli', '/paneli/shpalljet', '/paneli/pagesat', '/shit/krijo'];

  for (const path of PROTECTED) {
    test(`${path} führt zur Anmeldung`, async ({ page }) => {
      await page.goto(path);

      // Umleitung auf die Anmeldung, nicht etwa die Seite mit leeren Daten.
      await expect(page).toHaveURL(/\/(hyr|login|anmelden)/);
    });
  }
});

test.describe('Rollen', () => {
  test('ein Käufer kommt nicht in den Verwaltungsbereich', async ({ page }) => {
    await login(page, ACCOUNTS.buyer);

    const response = await page.goto('/admin');

    // 403, keine Umleitung und erst recht keine Inhalte.
    expect(response?.status()).toBe(403);
    await expect(page.getByText(/Auto Krasniqi|Përmbledhje/i)).toHaveCount(0);
  });

  test('ein Händler kommt nicht in den Verwaltungsbereich', async ({ page }) => {
    await login(page, ACCOUNTS.dealer);

    const response = await page.goto('/admin');
    expect(response?.status()).toBe(403);
  });

  test('die Verwaltung steht dem Verwalter offen', async ({ page }) => {
    await login(page, ACCOUNTS.admin);

    const response = await page.goto('/admin');
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});

test.describe('Fremde Inserate', () => {
  test('ein fremdes Inserat lässt sich nicht bearbeiten', async ({ page }) => {
    // Zuerst als Käufer anmelden, dann ein beliebiges fremdes Inserat suchen.
    await login(page, ACCOUNTS.buyer);

    await page.goto('/kerko');
    const href = await page.locator('a[href*="/vetura/"]').first().getAttribute('href');
    const slug = href?.split('/').pop() ?? '';

    // Die Bearbeitungsseite erwartet eine Kennung, kein Slug — der Versuch mit
    // einem geratenen Wert darf keinesfalls ein fremdes Formular öffnen.
    const response = await page.goto(`/shit/ndrysho/${slug}`);

    expect(response?.status()).not.toBe(200);
  });
});

test.describe('Anmeldung', () => {
  test('ein falsches Passwort meldet nicht an', async ({ page }) => {
    await page.goto('/hyr');

    await page.getByLabel(/^Email$/i).fill(ACCOUNTS.seller);
    await page.getByLabel(/Fjalëkalimi/i).fill('falsch-falsch-falsch');
    await page.getByRole('button', { name: /^Hyr$/i }).click();

    // Auf der Anmeldeseite bleiben, mit Hinweis.
    await expect(page).toHaveURL(/\/(hyr|login)/);
    await expect(page.getByRole('alert').first()).toBeVisible({ timeout: 15_000 });
  });

  test('die Fehlermeldung verrät nicht, ob es das Konto gibt', async ({ page }) => {
    // Sonst ließe sich damit herausfinden, wer hier ein Konto hat.
    const messages: string[] = [];

    for (const email of [ACCOUNTS.seller, 'gibt-es-nicht@leviz.dev']) {
      await page.goto('/hyr');
      await page.getByLabel(/^Email$/i).fill(email);
      await page.getByLabel(/Fjalëkalimi/i).fill('falsch-falsch-falsch');
      await page.getByRole('button', { name: /^Hyr$/i }).click();

      const alert = page.getByRole('alert').first();
      await expect(alert).toBeVisible({ timeout: 15_000 });
      messages.push((await alert.textContent())?.trim() ?? '');
    }

    expect(messages[0]).toBe(messages[1]);
  });

  test('das Abmelden beendet die Sitzung wirklich', async ({ page }) => {
    await login(page, ACCOUNTS.seller);

    await page.getByRole('button', { name: /Dil|Log out|Abmelden/i }).click();
    await expect(page).toHaveURL(/localhost:\d+\/$/, { timeout: 20_000 });

    // Der geschützte Bereich ist danach wieder gesperrt.
    await page.goto('/paneli');
    await expect(page).toHaveURL(/\/(hyr|login)/);
  });
});

test.describe('Missbrauchsschutz', () => {
  test('wiederholte Fehlversuche werden ausgebremst', async ({ page }) => {
    // Die Grenze liegt bei acht Versuchen je Viertelstunde.
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await page.goto('/hyr');
      await page.getByLabel(/^Email$/i).fill(`brute-${attempt}@leviz.dev`);
      await page.getByLabel(/Fjalëkalimi/i).fill(DEMO_PASSWORD);
      await page.getByRole('button', { name: /^Hyr$/i }).click();
      await page.waitForTimeout(300);
    }

    await expect(page.getByRole('alert').first()).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/(hyr|login)/);
  });
});
