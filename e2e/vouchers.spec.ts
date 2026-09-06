import { expect, test, type Page } from '@playwright/test';

import { ACCOUNTS, DEMO_PASSWORD, login } from './helpers';

/**
 * Ein Gutscheincode über den vollen Preis.
 *
 * Der Weg geht durch beide Hälften: die Verwaltung legt den Code an, ein
 * frisch angelegtes Konto löst ihn ein. Ein festes Konto wäre nur einmal
 * grün — nach der ersten Einlösung ist das Paket gebucht und der Knopf weg.
 */
const kennung = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function registriere(page: Page, email: string) {
  await page.goto('/regjistrohu');
  await page.getByLabel(/Emri dhe mbiemri/i).fill('Kupon Test');
  await page.getByLabel(/^Email$/i).fill(email);
  await page.getByLabel(/^Fjalëkalimi$/i).fill(DEMO_PASSWORD);
  await page.getByLabel(/Përsërit fjalëkalimin/i).fill(DEMO_PASSWORD);
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: /^Krijo llogari$/i }).click();

  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Përshëndetje/i, {
    timeout: 30_000,
  });
}

/**
 * Legt einen Code über hundert Prozent an und gibt ihn zurück.
 *
 * Zahlenfelder werden vorher geleert: ein Feld mit Vorgabewert hängt den neuen
 * Wert sonst an den alten an, und aus 100 wird 100100.
 */
async function legeCodeAn(page: Page, praefix: string): Promise<string> {
  await page.goto('/admin/vouchers');

  await page.getByLabel(/^Përqindja$/i).clear();
  await page.getByLabel(/^Përqindja$/i).fill('100');
  await page.getByLabel(/^Sa kode$/i).clear();
  await page.getByLabel(/^Sa kode$/i).fill('1');
  await page.getByLabel(/^Parashtesa$/i).clear();
  await page.getByLabel(/^Parashtesa$/i).fill(praefix);

  await page.getByRole('button', { name: /^Krijo$/i }).click();

  const feld = page.locator('textarea[readonly]');
  await expect(feld).toBeVisible({ timeout: 20_000 });

  return ((await feld.inputValue()) ?? '').trim();
}

/**
 * Code auf dem ersten bezahlten Paket einlösen und den Kauf auslösen.
 *
 * Ohne Zuschnitt auf eine bestimmte Karte: das erste Codefeld der Seite gehört
 * zum ersten kostenpflichtigen Paket, und genau darum geht es hier.
 */
async function loeseEin(page: Page, code: string) {
  await page.goto('/cmimet');

  await page.getByRole('button', { name: /kod zbritjeje/i }).first().click();
  await page.getByPlaceholder(/LEVIZ2026/i).first().fill(code);
  await page.getByRole('button', { name: /^Apliko$/i }).first().click();

  const kostenlos = page.getByRole('button', { name: /Aktivizo falas/i }).first();
  await expect(kostenlos).toBeVisible({ timeout: 20_000 });
  await kostenlos.click();
}

test.describe('Gutscheincodes', () => {
  test('hundert Prozent schalten das Paket ohne Zahlung frei', async ({ page, context }) => {
    test.setTimeout(120_000);

    await login(page, ACCOUNTS.admin);
    const code = await legeCodeAn(page, `T${kennung().slice(0, 5).toUpperCase()}`);
    expect(code, 'der erzeugte Code steht zum Kopieren bereit').toMatch(/^[A-Z0-9]{6,}$/);

    await context.clearCookies();
    await registriere(page, `kupon-${kennung()}@leviz.invalid`);

    await loeseEin(page, code);

    // Gewährt wird über denselben Weg wie nach einer echten Zahlung: es
    // entsteht eine Buchung über null Euro, und das Paket läuft.
    await expect(page.getByText(/Pakoja aktive/i)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/E kryer/i).first()).toBeVisible();
  });

  test('ein Code mit einer Einloesung geht kein zweites Mal', async ({ page, context }) => {
    // Drei Anmeldungen, zwei Registrierungen, ein Kauf: das dauert länger als
    // der Vorgabewert.
    test.setTimeout(150_000);

    await login(page, ACCOUNTS.admin);
    const code = await legeCodeAn(page, `Z${kennung().slice(0, 5).toUpperCase()}`);

    await context.clearCookies();
    await registriere(page, `kupon2-${kennung()}@leviz.invalid`);
    await loeseEin(page, code);
    await expect(page.getByText(/Pakoja aktive/i)).toBeVisible({ timeout: 30_000 });

    // Zweites Konto, derselbe Code. Er war für eine Einlösung gedacht und ist
    // damit aufgebraucht — für jeden, nicht nur für den ersten.
    await context.clearCookies();
    await registriere(page, `kupon3-${kennung()}@leviz.invalid`);

    await page.goto('/cmimet');
    await page.getByRole('button', { name: /kod zbritjeje/i }).first().click();
    await page.getByPlaceholder(/LEVIZ2026/i).first().fill(code);
    await page.getByRole('button', { name: /^Apliko$/i }).first().click();

    await expect(page.getByText(/shfrytëzuar plotësisht/i)).toBeVisible({ timeout: 20_000 });
    // Und der Knopf bleibt, was er war: ein Kauf.
    await expect(page.getByRole('button', { name: /Aktivizo falas/i })).toHaveCount(0);
  });
});
