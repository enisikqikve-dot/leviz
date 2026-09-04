import type { Locale } from '@/lib/i18n/routing';

/**
 * Worauf sich eine Zahlung bezieht.
 *
 * Die Spalte `description` bleibt als Beleg für den Zahlungsanbieter erhalten,
 * ist aber in einer festen Sprache eingefroren. Für die Anzeige wird der Bezug
 * deshalb aus den verknüpften Datensätzen hergeleitet — sonst stünde auf einer
 * englischen Seite „Pako: Premium“.
 */
export type PaymentSubject = {
  vehicle: { title: string } | null;
  package: { nameSq: string; nameDe: string; nameEn: string } | null;
};

export function paymentSubject(payment: PaymentSubject, locale: Locale): string | null {
  if (payment.vehicle) return payment.vehicle.title;
  if (!payment.package) return null;

  switch (locale) {
    case 'de':
      return payment.package.nameDe;
    case 'en':
      return payment.package.nameEn;
    default:
      return payment.package.nameSq;
  }
}

/** Ist die Zahlung eine Hervorhebung oder eine Paketbuchung? */
export function isFeaturePayment(payment: PaymentSubject): boolean {
  return payment.vehicle !== null;
}
