/**
 * Reproduzierbarer Zufall. Der Seed-Lauf muss bei gleicher Eingabe dieselben
 * Daten erzeugen, sonst sind Fehlerbilder nicht nachstellbar.
 */

/** mulberry32 — klein, schnell, ausreichend gleichverteilt fuer Testdaten. */
export function createRandom(seed: number) {
  let state = seed >>> 0;

  function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  return {
    next,

    /** Ganzzahl von min bis max, beide einschliesslich. */
    int(min: number, max: number): number {
      return Math.floor(next() * (max - min + 1)) + min;
    },

    float(min: number, max: number, decimals = 1): number {
      const value = next() * (max - min) + min;
      return Number(value.toFixed(decimals));
    },

    pick<T>(items: readonly T[]): T {
      return items[Math.floor(next() * items.length)];
    },

    /** Trifft mit der angegebenen Wahrscheinlichkeit zu. */
    chance(probability: number): boolean {
      return next() < probability;
    },

    /** Zieht aus einer gewichteten Liste. */
    weighted<T>(items: readonly { item: T; weight: number }[]): T {
      const total = items.reduce((sum, entry) => sum + entry.weight, 0);
      let threshold = next() * total;
      for (const entry of items) {
        threshold -= entry.weight;
        if (threshold <= 0) return entry.item;
      }
      return items[items.length - 1].item;
    },

    /** Mischt eine Kopie der Liste, ohne das Original zu veraendern. */
    shuffle<T>(items: readonly T[]): T[] {
      const copy = [...items];
      for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(next() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    },

    /**
     * Normalverteilte Zahl, auf min bis max begrenzt. Damit wirken Baujahre
     * und Kilometerstaende natuerlicher als mit Gleichverteilung.
     */
    normal(mean: number, deviation: number, min: number, max: number): number {
      const u1 = Math.max(next(), 1e-9);
      const u2 = next();
      const gauss = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      return Math.min(max, Math.max(min, Math.round(mean + gauss * deviation)));
    },
  };
}

export type Random = ReturnType<typeof createRandom>;
