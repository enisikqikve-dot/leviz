/**
 * Auswertung der Einnahmen nach Monaten.
 *
 * Bewusst eine reine Funktion ohne Datenbankzugriff: die Rechenregeln sind der
 * heikle Teil — was zählt als Einnahme, was passiert bei einer Erstattung, was
 * heisst „plus soundsoviel Prozent", wenn der Vormonat null war. Das lässt sich
 * so prüfen, ohne eine Datenbank zu füllen.
 */

/** Eine Zahlung, so weit sie für die Auswertung gebraucht wird. */
export type RevenueRow = {
  amountCents: number;
  status: string;
  /** Wann das Geld geflossen ist; bei offenen Zahlungen das Anlegedatum. */
  at: Date;
  /** Wofür gezahlt wurde, in der Sprache des Betrachters. */
  subject: string;
};

export type MonthBucket = {
  /** Jahr und Monat als `2026-09`. */
  month: string;
  cents: number;
  count: number;
};

export type SubjectBucket = {
  subject: string;
  cents: number;
  count: number;
};

export type RevenueReport = {
  /** Aufsteigend, ohne Lücken: Monate ohne Zahlung stehen als Null darin. */
  months: MonthBucket[];
  current: MonthBucket;
  previous: MonthBucket;
  /** Unterschied zum Vormonat in Cent, negativ bei Rückgang. */
  deltaCents: number;
  /**
   * Veränderung in Prozent — `null`, wenn der Vormonat null war. Aus null
   * heraus gibt es keinen sinnvollen Prozentwert; „+100 %" wäre erfunden.
   */
  deltaPercent: number | null;
  /** Durchschnitt je Zahlung im laufenden Monat, `null` ohne Zahlung. */
  averageCents: number | null;
  /** Erstattungen des laufenden Monats, getrennt ausgewiesen. */
  refundedCents: number;
  /** Wofür im laufenden Monat gezahlt wurde, absteigend nach Betrag. */
  bySubject: SubjectBucket[];
  /** Noch nicht abgeschlossene Zahlungen, unabhängig vom Monat. */
  pendingCount: number;
  pendingCents: number;
};

/** `2026-09` aus einem Zeitpunkt. */
export function monthKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, '0');
  return `${year}-${month}`;
}

/** Verschiebt einen Monatsschlüssel um `offset` Monate. */
export function shiftMonth(key: string, offset: number): string {
  const [year, month] = key.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));
  return monthKey(date);
}

/** Die letzten `count` Monatsschlüssel bis einschliesslich `until`. */
function monthRange(until: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) => shiftMonth(until, index - count + 1));
}

const EMPTY = (month: string): MonthBucket => ({ month, cents: 0, count: 0 });

/**
 * Baut den Bericht.
 *
 * Als Einnahme zählt ausschliesslich, was tatsächlich eingegangen ist
 * (`SUCCEEDED`). Erstattungen werden nicht davon abgezogen, sondern getrennt
 * ausgewiesen: eine Erstattung fällt oft in einen anderen Monat als die
 * Zahlung, und stillschweigendes Verrechnen liesse einen Monat schrumpfen,
 * dessen Zahlen längst berichtet wurden.
 *
 * @param now Bezugszeitpunkt — als Parameter, damit die Auswertung prüfbar ist.
 * @param monthsBack Wie viele Monate der Verlauf zeigt, einschliesslich des laufenden.
 */
export function buildRevenueReport(
  rows: RevenueRow[],
  now: Date,
  monthsBack = 12,
): RevenueReport {
  const currentKey = monthKey(now);
  const previousKey = shiftMonth(currentKey, -1);
  const keys = monthRange(currentKey, monthsBack);

  // Monate ohne Zahlung müssen als Null erscheinen, nicht fehlen. Sonst zieht
  // das Diagramm eine Linie über die Lücke und behauptet einen Verlauf.
  const buckets = new Map<string, MonthBucket>(keys.map((key) => [key, EMPTY(key)]));

  const bySubject = new Map<string, SubjectBucket>();
  let refundedCents = 0;
  let pendingCount = 0;
  let pendingCents = 0;

  for (const row of rows) {
    const key = monthKey(row.at);

    if (row.status === 'PENDING') {
      pendingCount += 1;
      pendingCents += row.amountCents;
      continue;
    }

    if (row.status === 'REFUNDED') {
      if (key === currentKey) refundedCents += row.amountCents;
      continue;
    }

    if (row.status !== 'SUCCEEDED') continue;

    const bucket = buckets.get(key);
    if (bucket) {
      bucket.cents += row.amountCents;
      bucket.count += 1;
    }

    if (key === currentKey) {
      const entry = bySubject.get(row.subject) ?? { subject: row.subject, cents: 0, count: 0 };
      entry.cents += row.amountCents;
      entry.count += 1;
      bySubject.set(row.subject, entry);
    }
  }

  const months = keys.map((key) => buckets.get(key)!);
  const current = buckets.get(currentKey) ?? EMPTY(currentKey);
  const previous = buckets.get(previousKey) ?? EMPTY(previousKey);

  return {
    months,
    current,
    previous,
    deltaCents: current.cents - previous.cents,
    deltaPercent:
      previous.cents === 0
        ? null
        : ((current.cents - previous.cents) / previous.cents) * 100,
    averageCents: current.count === 0 ? null : Math.round(current.cents / current.count),
    refundedCents,
    bySubject: [...bySubject.values()].sort((a, b) => b.cents - a.cents),
    pendingCount,
    pendingCents,
  };
}
