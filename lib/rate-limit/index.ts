export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  /** Zeitpunkt in Millisekunden, ab dem wieder Versuche moeglich sind. */
  resetAt: number;
};

export interface RateLimiter {
  check(key: string, limit: number, windowMs: number): Promise<RateLimitResult>;
  reset(key: string): Promise<void>;
}

type Bucket = { timestamps: number[] };

/**
 * Gleitendes Zeitfenster im Arbeitsspeicher. Reicht fuer einen einzelnen
 * Anwendungsprozess; sobald LEVIZ auf mehreren Instanzen laeuft, wird hier ein
 * Redis-Anbieter eingehaengt, ohne dass die Aufrufer sich aendern.
 */
class MemoryRateLimiter implements RateLimiter {
  private readonly buckets = new Map<string, Bucket>();
  private lastSweep = Date.now();

  async check(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const now = Date.now();
    this.sweep(now, windowMs);

    const bucket = this.buckets.get(key) ?? { timestamps: [] };
    const cutoff = now - windowMs;
    const recent = bucket.timestamps.filter((t) => t > cutoff);

    if (recent.length >= limit) {
      const oldest = recent[0] ?? now;
      this.buckets.set(key, { timestamps: recent });
      return {
        success: false,
        limit,
        remaining: 0,
        resetAt: oldest + windowMs,
      };
    }

    recent.push(now);
    this.buckets.set(key, { timestamps: recent });

    return {
      success: true,
      limit,
      remaining: limit - recent.length,
      resetAt: now + windowMs,
    };
  }

  async reset(key: string): Promise<void> {
    this.buckets.delete(key);
  }

  /** Raeumt abgelaufene Eintraege auf, damit die Map nicht unbegrenzt waechst. */
  private sweep(now: number, windowMs: number) {
    if (now - this.lastSweep < 60_000) return;
    this.lastSweep = now;

    const cutoff = now - windowMs;
    for (const [key, bucket] of this.buckets) {
      const recent = bucket.timestamps.filter((t) => t > cutoff);
      if (recent.length === 0) this.buckets.delete(key);
      else bucket.timestamps = recent;
    }
  }
}

const globalForLimiter = globalThis as unknown as { levizRateLimiter?: RateLimiter };

export const rateLimiter: RateLimiter =
  globalForLimiter.levizRateLimiter ?? new MemoryRateLimiter();

if (process.env.NODE_ENV !== 'production') {
  globalForLimiter.levizRateLimiter = rateLimiter;
}

/** Voreinstellungen fuer die sensiblen Endpunkte. */
export const RATE_LIMITS = {
  login: { limit: 8, windowMs: 15 * 60_000 },
  register: { limit: 5, windowMs: 60 * 60_000 },
  passwordReset: { limit: 4, windowMs: 60 * 60_000 },
  phoneCode: { limit: 4, windowMs: 15 * 60_000 },
  contactSeller: { limit: 12, windowMs: 60 * 60_000 },
  // Textvorschläge sind heute billig, kosten aber Geld, sobald ein
  // Sprachmodell dahintersteht. Die Grenze gilt deshalb von Anfang an.
  aiDescribe: { limit: 20, windowMs: 60 * 60_000 },
  // Gebremst wird hier nicht der Anmeldeversuch, sondern das Durchprobieren
  // des alten Passworts an einem offenen Browser.
  passwordChange: { limit: 6, windowMs: 15 * 60_000 },
  // Fehlermeldungen sind ohne Anmeldung moeglich; die Grenze haelt
  // Formular-Spam heraus, ohne einen ehrlichen Melder auszubremsen.
  bugReport: { limit: 10, windowMs: 60 * 60_000 },
  // Ein Antrag auf Pruefung kostet einen Menschen Arbeit. Wer ihn in kurzer
  // Folge mehrfach stellt, meint es nicht ernst -- fuer eine Nachbesserung
  // nach einer Ablehnung reichen fuenf am Tag bei Weitem.
  verification: { limit: 5, windowMs: 24 * 60 * 60_000 },
} as const;
