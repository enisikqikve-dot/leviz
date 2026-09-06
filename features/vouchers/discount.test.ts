import { describe, expect, it } from 'vitest';

import {
  CODE_BODY_LENGTH,
  checkVoucher,
  discountFor,
  generateCodes,
  normalizeCode,
  type VoucherState,
} from './discount';

const JETZT = new Date('2026-09-06T12:00:00.000Z');

const gutschein = (teil: Partial<VoucherState> = {}): VoucherState => ({
  kind: 'PERCENT',
  percentOff: 20,
  amountOffCents: null,
  packageId: null,
  maxRedemptions: 1,
  redeemedCount: 0,
  validFrom: new Date('2026-01-01T00:00:00.000Z'),
  validUntil: null,
  active: true,
  ...teil,
});

const pruefe = (state: VoucherState, preis: number, teil = {}) =>
  checkVoucher(state, preis, {
    now: JETZT,
    packageId: 'paket1',
    alreadyRedeemed: false,
    ...teil,
  });

describe('normalizeCode', () => {
  it('macht aus Schreibweise und Trennern denselben Code', () => {
    expect(normalizeCode(' leviz-10 ')).toBe('LEVIZ10');
    expect(normalizeCode('LEVIZ 10')).toBe('LEVIZ10');
    expect(normalizeCode('LeViZ10')).toBe('LEVIZ10');
  });
});

describe('discountFor', () => {
  it('rechnet Prozente', () => {
    expect(discountFor(4900, gutschein({ percentOff: 20 }))).toBe(980);
    expect(discountFor(9900, gutschein({ percentOff: 50 }))).toBe(4950);
  });

  it('macht bei hundert Prozent kostenlos', () => {
    expect(discountFor(19900, gutschein({ percentOff: 100 }))).toBe(19900);
  });

  it('zieht feste Betraege ab', () => {
    expect(
      discountFor(4900, gutschein({ kind: 'AMOUNT', percentOff: null, amountOffCents: 1000 })),
    ).toBe(1000);
  });

  it('gibt niemals mehr zurueck als der Preis', () => {
    // Sonst ergaebe ein Gutschein ueber 50 Euro auf ein Paket fuer 9,99 Euro
    // einen negativen Betrag -- eine Zahlung, die dem Kunden Geld gibt.
    expect(
      discountFor(999, gutschein({ kind: 'AMOUNT', percentOff: null, amountOffCents: 5000 })),
    ).toBe(999);
  });

  it('laesst kostenlose Pakete unberuehrt', () => {
    expect(discountFor(0, gutschein({ percentOff: 100 }))).toBe(0);
  });
});

describe('checkVoucher', () => {
  it('nimmt einen gueltigen Code an', () => {
    const ergebnis = pruefe(gutschein({ percentOff: 25 }), 4900);

    expect(ergebnis).toEqual({
      ok: true,
      discountCents: 1225,
      finalCents: 3675,
      free: false,
    });
  });

  it('meldet bei hundert Prozent kostenlos', () => {
    const ergebnis = pruefe(gutschein({ percentOff: 100 }), 9900);

    expect(ergebnis.ok && ergebnis.free).toBe(true);
    expect(ergebnis.ok && ergebnis.finalCents).toBe(0);
  });

  it('weist abgeschaltete, kuenftige und abgelaufene Codes ab', () => {
    expect(pruefe(gutschein({ active: false }), 4900)).toEqual({
      ok: false,
      reason: 'inactive',
    });
    expect(
      pruefe(gutschein({ validFrom: new Date('2026-12-01T00:00:00.000Z') }), 4900),
    ).toEqual({ ok: false, reason: 'notStarted' });
    expect(
      pruefe(gutschein({ validUntil: new Date('2026-08-01T00:00:00.000Z') }), 4900),
    ).toEqual({ ok: false, reason: 'expired' });
  });

  it('weist aufgebrauchte Codes ab', () => {
    expect(pruefe(gutschein({ maxRedemptions: 5, redeemedCount: 5 }), 4900)).toEqual({
      ok: false,
      reason: 'exhausted',
    });
  });

  it('haelt einen Code fuer ein anderes Paket zurueck', () => {
    expect(pruefe(gutschein({ packageId: 'paket2' }), 4900)).toEqual({
      ok: false,
      reason: 'otherPackage',
    });
  });

  it('laesst dasselbe Konto nicht zweimal einloesen', () => {
    expect(pruefe(gutschein(), 4900, { alreadyRedeemed: true })).toEqual({
      ok: false,
      reason: 'alreadyUsed',
    });
  });

  it('weist einen Code ohne Wirkung ab', () => {
    // Ein Prozentgutschein auf ein kostenloses Paket ergibt null Rabatt --
    // das als Erfolg zu melden waere irrefuehrend.
    expect(pruefe(gutschein({ percentOff: 100 }), 0)).toEqual({
      ok: false,
      reason: 'noDiscount',
    });
  });
});

describe('generateCodes', () => {
  it('erzeugt die gewuenschte Anzahl, alle verschieden', () => {
    const codes = generateCodes('LEVIZ', 100);

    expect(codes).toHaveLength(100);
    expect(new Set(codes).size).toBe(100);
  });

  it('setzt das Praefix voran und haelt die Laenge ein', () => {
    for (const code of generateCodes('leviz-', 5)) {
      expect(code.startsWith('LEVIZ')).toBe(true);
      expect(code).toHaveLength('LEVIZ'.length + CODE_BODY_LENGTH);
    }
  });

  it('meidet verwechselbare Zeichen', () => {
    // 0/O und 1/I/L werden beim Abtippen vertauscht.
    for (const code of generateCodes('', 50)) {
      expect(code).not.toMatch(/[01OIL]/);
    }
  });

  it('kommt auch ohne Praefix aus', () => {
    expect(generateCodes('', 3).every((code) => code.length === CODE_BODY_LENGTH)).toBe(true);
  });
});
