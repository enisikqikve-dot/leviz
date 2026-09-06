import { defineConfig, devices } from '@playwright/test';

/**
 * End-zu-End-Tests.
 *
 * Geprüft wird gegen einen **Produktionsbuild**, nicht gegen den
 * Entwicklungsserver. Zwei Fehler dieses Projekts sind ausschließlich im
 * Produktionsbuild aufgetreten — ein Export aus einer `'use server'`-Datei kam
 * im Browser als Platzhalter an und ließ die Fahrzeugseite mit 500 antworten.
 * Ein Test gegen `next dev` hätte das nicht gesehen.
 *
 * Der eigene Browser wird mitbenutzt (`channel: 'chrome'`), damit kein
 * zusätzlicher Browser heruntergeladen werden muss.
 */
const PORT = 3210;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  // Die Anmeldung schreibt in dieselbe Datenbank; parallele Läufe würden sich
  // gegenseitig die Sitzung wegnehmen.
  workers: 1,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 45_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Albanisch ist die Sprache des Zielmarkts und läuft ohne Präfix.
    locale: 'sq-AL',
    extraHTTPHeaders: { 'accept-language': 'sq-AL,sq' },
  },

  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
    { name: 'mobile', use: { ...devices['Pixel 7'], channel: 'chrome' } },
  ],

  webServer: {
    command: `npx next build && npx next start -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    // Der Bau dauert laenger, seit die Anwendung gewachsen ist. Fuenf Minuten
    // reichten nicht mehr, und der Abbruch sah aus wie ein Testfehler.
    timeout: 600_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
