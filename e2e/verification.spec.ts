import { expect, test, type Page } from '@playwright/test';

import { ACCOUNTS, DEMO_PASSWORD, login } from './helpers';

/**
 * Der ganze Weg der Ausweisprüfung: einreichen, entscheiden, Abzeichen.
 *
 * Jeder Test legt ein frisches Konto an. Mit einem festen Konto wäre er nur
 * einmal grün: nach der ersten Entscheidung steht dort kein Formular mehr,
 * sondern der Stand.
 */

/** Ein winziges, gültiges JPEG — 64x48, einfarbig. */
const JPEG_BASE64 =
  '/9j/2wBDAA0JCgsKCA0LCgsODg0PEyAVExISEyccHhcgLikxMC4pLSwzOko+MzZGNywtQFdBRkxOUlNSMj5aYVpQYEpRUk//2' +
  'wBDAQ4ODhMREyYVFSZPNS01T09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0//wAARC' +
  'AAwAEADASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFgEBAQEAAAAAA' +
  'AAAAAAAAAAAAAUG/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AnwGhTAAAAAAAAAAAAAAAAAAAAAAH/9k=';

const ausweis = (name: string) => ({
  name,
  mimeType: 'image/jpeg',
  buffer: Buffer.from(JPEG_BASE64, 'base64'),
});

async function melde(page: Page, email: string) {
  await page.goto('/hyr');
  await page.getByLabel(/^Email$/i).fill(email);
  await page.getByLabel(/Fjalëkalimi/i).fill(DEMO_PASSWORD);
  await page.getByRole('button', { name: /^Hyr$/i }).click();

  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Përshëndetje/i, {
    timeout: 20_000,
  });
}

/** Neues Konto, Antrag gestellt. Gibt Adresse und Name zurück. */
async function stelleAntrag(page: Page) {
  const kennung = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const email = `pruefung-${kennung}@leviz.invalid`;
  const name = `Pruefung ${kennung}`;

  await page.goto('/regjistrohu');
  await page.getByLabel(/^Emri/i).first().fill(name);
  await page.getByLabel(/^Email$/i).fill(email);
  await page.getByLabel(/^Fjalëkalimi$/i).fill(DEMO_PASSWORD);
  await page.getByLabel(/Përsërit|Konfirmo/i).fill(DEMO_PASSWORD);
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: /Regjistrohu|Krijo/i }).click();

  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Përshëndetje/i, {
    timeout: 20_000,
  });

  await page.goto('/paneli/verifikimi');

  await page.getByLabel(/Emri sipas dokumentit/i).fill(name);
  await page.getByLabel(/Rruga dhe numri/i).fill('Rruga B 12');
  await page.getByLabel(/Kodi postar/i).fill('10000');
  await page.getByLabel(/^Qyteti$/i).fill('Prishtinë');

  const felder = page.locator('input[type="file"]');
  await felder.nth(0).setInputFiles(ausweis('para.jpg'));
  await felder.nth(1).setInputFiles(ausweis('prapa.jpg'));

  await page.getByRole('button', { name: /Dërgo për verifikim/i }).click();

  // Danach steht kein Formular mehr da, sondern der Stand.
  await expect(page.getByText(/Në shqyrtim/i)).toBeVisible({ timeout: 30_000 });

  return { email, name };
}

test.describe('Ausweisprüfung', () => {
  test('einreichen, annehmen, Abzeichen', async ({ page, context }) => {
    const { email, name } = await stelleAntrag(page);

    await context.clearCookies();
    await login(page, ACCOUNTS.admin);
    await page.goto('/admin/verifications');

    const antrag = page.locator('li', { hasText: name }).first();
    await expect(antrag).toBeVisible();

    // Der Beleg hängt an einer Route, die den Verwalter erneut prüft.
    const belegAdresse =
      (await antrag
        .locator('a[href*="/api/verification/documents/"]')
        .first()
        .getAttribute('href')) ?? '';
    expect(belegAdresse).toMatch(/^\/api\/verification\/documents\//);

    const alsVerwalter = await page.request.get(belegAdresse);
    expect(alsVerwalter.status(), 'der Verwalter darf den Beleg sehen').toBe(200);
    expect(alsVerwalter.headers()['content-type']).toContain('image/');

    await antrag.getByRole('button', { name: /^Prano$/i }).click();
    await expect(page.getByText(/E pranuar/i).first()).toBeVisible({ timeout: 20_000 });

    // Der Antragsteller sieht die Bestätigung.
    await context.clearCookies();
    await melde(page, email);
    await page.goto('/paneli/verifikimi');
    await expect(page.getByText(/Identiteti u verifikua/i)).toBeVisible();

    // Und ohne Rechte kommt niemand an den Ausweis. Das ist der Punkt, an dem
    // diese Ablage sich von den Fahrzeugfotos unterscheidet.
    await context.clearCookies();
    const ohneAnmeldung = await page.request.get(belegAdresse);
    expect(ohneAnmeldung.status(), 'ohne Anmeldung bleibt der Beleg verborgen').toBe(404);
  });

  test('eine Ablehnung braucht einen Grund und nennt ihn dem Antragsteller', async ({
    page,
    context,
  }) => {
    const { email, name } = await stelleAntrag(page);

    await context.clearCookies();
    await login(page, ACCOUNTS.admin);
    await page.goto('/admin/verifications');

    const antrag = page.locator('li', { hasText: name }).first();
    await expect(antrag).toBeVisible();

    // Ohne Begründung geht es nicht weiter.
    await antrag.getByRole('button', { name: /^Refuzo$/i }).click();
    await expect(page.getByText(/arsyen e refuzimit/i)).toBeVisible({ timeout: 15_000 });

    await antrag.getByRole('textbox').fill('Letërnjoftimi nuk lexohet');
    await antrag.getByRole('button', { name: /^Refuzo$/i }).click();
    await expect(page.getByText(/E refuzuar/i).first()).toBeVisible({ timeout: 20_000 });

    // Der Grund muss beim Antragsteller ankommen, sonst lädt er dasselbe
    // noch einmal hoch.
    await context.clearCookies();
    await melde(page, email);
    await page.goto('/paneli/verifikimi');

    await expect(page.getByText(/Letërnjoftimi nuk lexohet/i)).toBeVisible();
    // Und er kann es erneut versuchen.
    await expect(page.getByRole('button', { name: /Dërgo për verifikim/i })).toBeVisible();
  });
});
