import { expect, type Page } from '@playwright/test';

/**
 * Die im README dokumentierten Demo-Konten. Sie existieren nur in der
 * Entwicklungsdatenbank; der Seed legt sie bei jedem Lauf neu an.
 */
export const ACCOUNTS = {
  admin: 'admin@leviz.dev',
  dealer: 'dealer@leviz.dev',
  seller: 'seller@leviz.dev',
  buyer: 'buyer@leviz.dev',
} as const;

export const DEMO_PASSWORD = 'Leviz2026!';

/** Meldet ein Demo-Konto an und wartet, bis die Kontoseite steht. */
export async function login(page: Page, email: string): Promise<void> {
  await page.goto('/hyr');

  await page.getByLabel(/^Email$/i).fill(email);
  await page.getByLabel(/Fjalëkalimi/i).fill(DEMO_PASSWORD);
  await page.getByRole('button', { name: /^Hyr$/i }).click();

  // Nach der Anmeldung führt der Weg auf die Kontoseite.
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Përshëndetje/i, {
    timeout: 20_000,
  });
}

/** Adresse des ersten Inserats aus der Trefferliste. */
export async function firstListingHref(page: Page): Promise<string> {
  await page.goto('/kerko');

  const link = page.locator('a[href*="/vetura/"]').first();
  await expect(link).toBeVisible();

  return (await link.getAttribute('href')) ?? '';
}
