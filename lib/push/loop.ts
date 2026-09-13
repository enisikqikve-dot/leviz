import { dispatchPendingPush } from '@/features/notifications/dispatch';

/**
 * Der Takt des Push-Versands: alle paar Sekunden nachsehen, ob etwas
 * unterwegs sein sollte.
 *
 * Gestartet einmal je Serverprozess aus instrumentation.ts. Der Zeiger liegt
 * an globalThis, damit ein Neuladen im Entwicklungsmodus keinen zweiten
 * Takt daneben startet. `unref()` sorgt dafuer, dass ein Skript, das die
 * Anwendung nur importiert, trotzdem enden kann.
 */
const SCHLUESSEL = Symbol.for('leviz.push-loop');
const TAKT_MS = 15_000;

type Zustand = { timer: ReturnType<typeof setInterval>; laeuft: boolean };

export function startPushLoop(intervalMs = TAKT_MS): void {
  const global = globalThis as unknown as Record<symbol, Zustand | undefined>;
  if (global[SCHLUESSEL]) return;

  const zustand: Zustand = { laeuft: false, timer: setInterval(() => void tick(), intervalMs) };
  zustand.timer.unref?.();
  global[SCHLUESSEL] = zustand;

  async function tick(): Promise<void> {
    // Ein Lauf, der laenger dauert als der Takt, bekommt keinen Zwilling.
    if (zustand.laeuft) return;
    zustand.laeuft = true;
    try {
      const bericht = await dispatchPendingPush();
      if (bericht.claimed || bericht.disabled || bericht.failed) {
        console.info(
          `  LEVIZ Push: ${bericht.sent} gesendet, ${bericht.failed} fehlgeschlagen, ` +
            `${bericht.disabled} Geraete stillgelegt, ${bericht.receipts} Quittungen`,
        );
      }
    } catch (fehler) {
      // Ein Aussetzer (Datenbank kurz weg, Expo nicht erreichbar) beendet den
      // Takt nicht -- der naechste Lauf holt nach, was liegen blieb.
      console.error('  LEVIZ Push-Versand:', fehler);
    } finally {
      zustand.laeuft = false;
    }
  }
}
