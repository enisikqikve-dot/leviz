/**
 * Rabattrechnung für Gutscheincodes.
 *
 * Reine Funktionen ohne Datenbank: Was ein Code wert ist und ob er gilt, ist
 * die eine Stelle, an der ein Fehler direkt Geld kostet — ein Code, der
 * versehentlich 100 % gibt, verschenkt jedes Abo. Deshalb steht die Rechnung
 * hier und nicht verteilt in der Kasse.
 */

export const VOUCHER_KINDS = ['PERCENT', 'AMOUNT'] as const;
export type VoucherKind = (typeof VOUCHER_KINDS)[number];

export type VoucherState = {
  kind: VoucherKind;
  percentOff: number | null;
  amountOffCents: number | null;
  packageId: string | null;
  maxRedemptions: number;
  redeemedCount: number;
  validFrom: Date;
  validUntil: Date | null;
  active: boolean;
};

export type VoucherRejection =
  | 'inactive'
  | 'notStarted'
  | 'expired'
  | 'exhausted'
  | 'otherPackage'
  | 'alreadyUsed'
  | 'noDiscount';

export type VoucherCheck =
  | { ok: true; discountCents: number; finalCents: number; free: boolean }
  | { ok: false; reason: VoucherRejection };

/**
 * Vereinheitlicht die Eingabe.
 *
 * Ein Code wird abgetippt oder aus einer Nachricht kopiert. Kleinschreibung,
 * ein mitkopiertes Leerzeichen oder ein Bindestrich dürfen nicht dazu führen,
 * dass ein gültiger Code nicht erkannt wird.
 */
export function normalizeCode(input: string): string {
  return input.trim().toUpperCase().replace(/[\s-]+/g, '');
}

/**
 * Der Rabatt in Cent, immer begrenzt auf den Preis.
 *
 * Ohne die Begrenzung ergäbe ein Betragsgutschein über 50 € auf ein Paket für
 * 9,99 € einen negativen Endbetrag — und damit eine Zahlung, die dem Kunden
 * Geld zurückgibt.
 */
export function discountFor(priceCents: number, voucher: VoucherState): number {
  if (priceCents <= 0) return 0;

  const roh =
    voucher.kind === 'PERCENT'
      ? Math.round((priceCents * (voucher.percentOff ?? 0)) / 100)
      : (voucher.amountOffCents ?? 0);

  return Math.max(0, Math.min(roh, priceCents));
}

/** Prüft alle Bedingungen und rechnet. */
export function checkVoucher(
  voucher: VoucherState,
  priceCents: number,
  options: { now: Date; packageId: string; alreadyRedeemed: boolean },
): VoucherCheck {
  if (!voucher.active) return { ok: false, reason: 'inactive' };
  if (options.now < voucher.validFrom) return { ok: false, reason: 'notStarted' };
  if (voucher.validUntil && options.now > voucher.validUntil) {
    return { ok: false, reason: 'expired' };
  }
  if (voucher.redeemedCount >= voucher.maxRedemptions) {
    return { ok: false, reason: 'exhausted' };
  }
  if (voucher.packageId && voucher.packageId !== options.packageId) {
    return { ok: false, reason: 'otherPackage' };
  }
  // Ein Code, ein Konto. Sonst löst derselbe Nutzer ihn beliebig oft ein.
  if (options.alreadyRedeemed) return { ok: false, reason: 'alreadyUsed' };

  const discountCents = discountFor(priceCents, voucher);
  if (discountCents <= 0) return { ok: false, reason: 'noDiscount' };

  const finalCents = priceCents - discountCents;

  return { ok: true, discountCents, finalCents, free: finalCents === 0 };
}

/**
 * Zeichen für erzeugte Codes.
 *
 * Ohne 0/O und 1/I/L: Codes werden am Telefon durchgegeben und von Hand
 * abgetippt, und genau diese Paare werden dabei verwechselt.
 */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export const MAX_GENERATED_CODES = 100;
export const CODE_BODY_LENGTH = 8;

/**
 * Erzeugt eindeutige Codes mit gemeinsamem Präfix.
 *
 * `random` ist einspeisbar, damit der Test nicht vom Zufall abhängt.
 */
export function generateCodes(
  prefix: string,
  count: number,
  random: () => number = Math.random,
): string[] {
  const sauber = normalizeCode(prefix).slice(0, 12);
  const menge = new Set<string>();

  // Obergrenze gegen eine Endlosschleife, falls `random` entartet ist.
  for (let versuch = 0; menge.size < count && versuch < count * 50; versuch += 1) {
    let koerper = '';
    for (let stelle = 0; stelle < CODE_BODY_LENGTH; stelle += 1) {
      koerper += ALPHABET[Math.floor(random() * ALPHABET.length) % ALPHABET.length];
    }
    menge.add(sauber ? `${sauber}${koerper}` : koerper);
  }

  return [...menge];
}
