/**
 * Laeuft einmal beim Start des Servers.
 *
 * Nur im Node-Laufzeitkontext und nicht waehrend des Bauens: der Push-Takt
 * braucht die Datenbank, und die gibt es beim `next build` nicht.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (process.env.NEXT_PHASE === 'phase-production-build') return;

  const { startPushLoop } = await import('./lib/push/loop');
  startPushLoop();
}
