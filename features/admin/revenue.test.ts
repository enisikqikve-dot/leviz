import { describe, expect, it } from 'vitest';

import { buildRevenueReport, monthKey, shiftMonth, type RevenueRow } from './revenue';

const JETZT = new Date('2026-09-15T10:00:00Z');

const zahlung = (
  amountCents: number,
  at: string,
  status = 'SUCCEEDED',
  subject = 'Premium',
): RevenueRow => ({ amountCents, status, at: new Date(at), subject });

describe('monthKey', () => {
  it('schreibt den Monat zweistellig', () => {
    expect(monthKey(new Date('2026-01-05T00:00:00Z'))).toBe('2026-01');
    expect(monthKey(new Date('2026-12-31T23:59:59Z'))).toBe('2026-12');
  });
});

describe('shiftMonth', () => {
  it('geht ueber die Jahresgrenze zurueck', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-01', -13)).toBe('2024-12');
  });

  it('geht ueber die Jahresgrenze vorwaerts', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
  });
});

describe('buildRevenueReport', () => {
  it('zaehlt nur eingegangene Zahlungen als Einnahme', () => {
    const report = buildRevenueReport(
      [
        zahlung(1000, '2026-09-02T00:00:00Z'),
        zahlung(500, '2026-09-03T00:00:00Z', 'PENDING'),
        zahlung(900, '2026-09-04T00:00:00Z', 'FAILED'),
      ],
      JETZT,
    );

    expect(report.current.cents).toBe(1000);
    expect(report.current.count).toBe(1);
  });

  it('weist Erstattungen getrennt aus statt sie abzuziehen', () => {
    // Eine Erstattung faellt oft in einen anderen Monat als die Zahlung.
    // Stillschweigendes Verrechnen liesse einen Monat schrumpfen, dessen
    // Zahlen laengst berichtet wurden.
    const report = buildRevenueReport(
      [zahlung(2000, '2026-09-02T00:00:00Z'), zahlung(700, '2026-09-09T00:00:00Z', 'REFUNDED')],
      JETZT,
    );

    expect(report.current.cents).toBe(2000);
    expect(report.refundedCents).toBe(700);
  });

  it('vergleicht mit dem Vormonat', () => {
    const report = buildRevenueReport(
      [
        zahlung(3000, '2026-09-05T00:00:00Z'),
        zahlung(2000, '2026-08-20T00:00:00Z'),
      ],
      JETZT,
    );

    expect(report.current.cents).toBe(3000);
    expect(report.previous.cents).toBe(2000);
    expect(report.deltaCents).toBe(1000);
    expect(report.deltaPercent).toBeCloseTo(50);
  });

  it('meldet einen Rueckgang mit negativen Werten', () => {
    const report = buildRevenueReport(
      [zahlung(500, '2026-09-05T00:00:00Z'), zahlung(2000, '2026-08-20T00:00:00Z')],
      JETZT,
    );

    expect(report.deltaCents).toBe(-1500);
    expect(report.deltaPercent).toBeCloseTo(-75);
  });

  it('erfindet keinen Prozentwert, wenn der Vormonat null war', () => {
    // Aus null heraus gibt es keine prozentuale Steigerung. "+100 %" waere
    // eine Behauptung, die die Zahlen nicht hergeben.
    const report = buildRevenueReport([zahlung(4200, '2026-09-05T00:00:00Z')], JETZT);

    expect(report.previous.cents).toBe(0);
    expect(report.deltaCents).toBe(4200);
    expect(report.deltaPercent).toBeNull();
  });

  it('liefert auch ganz ohne Zahlungen ein vollstaendiges Ergebnis', () => {
    const report = buildRevenueReport([], JETZT);

    expect(report.current.cents).toBe(0);
    expect(report.deltaCents).toBe(0);
    expect(report.deltaPercent).toBeNull();
    expect(report.averageCents).toBeNull();
    expect(report.bySubject).toEqual([]);
  });

  it('fuellt Monate ohne Zahlung mit Null statt sie wegzulassen', () => {
    const report = buildRevenueReport([zahlung(1000, '2026-09-05T00:00:00Z')], JETZT, 6);

    expect(report.months).toHaveLength(6);
    expect(report.months.map((m) => m.month)).toEqual([
      '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09',
    ]);
    expect(report.months.every((m) => typeof m.cents === 'number')).toBe(true);
  });

  it('gibt den Verlauf aufsteigend aus und endet im laufenden Monat', () => {
    const report = buildRevenueReport([], JETZT, 12);

    expect(report.months).toHaveLength(12);
    expect(report.months[0].month).toBe('2025-10');
    expect(report.months[11].month).toBe('2026-09');
  });

  it('laesst aeltere Zahlungen ausserhalb des Zeitraums weg', () => {
    const report = buildRevenueReport(
      [zahlung(9999, '2024-01-05T00:00:00Z'), zahlung(100, '2026-09-05T00:00:00Z')],
      JETZT,
      6,
    );

    const summe = report.months.reduce((total, month) => total + month.cents, 0);
    expect(summe).toBe(100);
  });

  it('rechnet den Durchschnitt je Zahlung', () => {
    const report = buildRevenueReport(
      [
        zahlung(1000, '2026-09-02T00:00:00Z'),
        zahlung(2000, '2026-09-03T00:00:00Z'),
        zahlung(1500, '2026-09-04T00:00:00Z'),
      ],
      JETZT,
    );

    expect(report.averageCents).toBe(1500);
  });

  it('zeigt, wofuer im laufenden Monat gezahlt wurde', () => {
    const report = buildRevenueReport(
      [
        zahlung(1000, '2026-09-02T00:00:00Z', 'SUCCEEDED', 'Premium'),
        zahlung(500, '2026-09-03T00:00:00Z', 'SUCCEEDED', 'Hervorhebung'),
        zahlung(1000, '2026-09-04T00:00:00Z', 'SUCCEEDED', 'Premium'),
        // Der Vormonat gehoert nicht in diese Aufschluesselung.
        zahlung(9000, '2026-08-04T00:00:00Z', 'SUCCEEDED', 'Enterprise'),
      ],
      JETZT,
    );

    expect(report.bySubject).toEqual([
      { subject: 'Premium', cents: 2000, count: 2 },
      { subject: 'Hervorhebung', cents: 500, count: 1 },
    ]);
  });

  it('zaehlt offene Zahlungen unabhaengig vom Monat', () => {
    const report = buildRevenueReport(
      [
        zahlung(300, '2026-09-02T00:00:00Z', 'PENDING'),
        zahlung(700, '2026-05-02T00:00:00Z', 'PENDING'),
      ],
      JETZT,
    );

    expect(report.pendingCount).toBe(2);
    expect(report.pendingCents).toBe(1000);
  });

  it('ordnet eine Zahlung am Monatsersten dem richtigen Monat zu', () => {
    // Grenzfall: Mitternacht am Monatsanfang.
    const report = buildRevenueReport(
      [zahlung(100, '2026-09-01T00:00:00Z'), zahlung(200, '2026-08-31T23:59:59Z')],
      JETZT,
    );

    expect(report.current.cents).toBe(100);
    expect(report.previous.cents).toBe(200);
  });
});
