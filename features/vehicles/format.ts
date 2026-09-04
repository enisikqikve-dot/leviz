import { formatDecimal, formatNumber } from '@/lib/currency';
import type { Locale } from '@/lib/i18n/routing';

/**
 * Datumsangaben laufen weiter über Intl. Zahlen dagegen werden in
 * `lib/currency.ts` selbst formatiert, weil Node und Chrome unterschiedliche
 * ICU-Stände mitbringen und derselbe Wert sonst je nach Umgebung anders
 * aussieht.
 */
const INTL_LOCALE: Record<Locale, string> = { sq: 'sq-AL', de: 'de-DE', en: 'en-GB' };

/** Kilowatt in Pferdestaerken. In der Region wird fast nur in PS gesprochen. */
export function kwToHp(kw: number): number {
  return Math.round(kw * 1.35962);
}

export function formatPower(kw: number | null, locale: Locale): string | null {
  if (kw === null || kw <= 0) return null;
  const unit = locale === 'sq' ? 'kf' : locale === 'de' ? 'PS' : 'hp';
  return `${formatNumber(kwToHp(kw), locale)} ${unit}`;
}

export function formatMileage(km: number | null, locale: Locale): string | null {
  if (km === null || km < 0) return null;
  return `${formatNumber(km, locale)} km`;
}

/** Nur das Jahr der Erstzulassung — mehr braucht eine Ergebniskarte nicht. */
export function registrationYear(date: Date | null): number | null {
  return date ? date.getFullYear() : null;
}

export function formatRegistration(date: Date | null, locale: Locale): string | null {
  if (!date) return null;
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function formatDate(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], { dateStyle: 'long' }).format(date);
}

/** Ganze Tage zwischen einem Zeitpunkt und jetzt, nie negativ. */
export function daysSince(date: Date, now: Date = new Date()): number {
  const diff = now.getTime() - date.getTime();
  return Math.max(0, Math.floor(diff / 86_400_000));
}

export function formatConsumption(litres: number | null, locale: Locale): string | null {
  if (litres === null) return null;
  return `${formatDecimal(litres, locale, 1)} l/100 km`;
}

/**
 * Der Teil des Titels, der über Marke und Modell hinausgeht — also die
 * Motorisierung oder Ausstattungslinie. Die Ergebniskarte zeigt Marke und
 * Modell bereits in der Überschrift; ohne diesen Schnitt stünde dort zweimal
 * dasselbe.
 */
export function variantFromTitle(
  title: string,
  brandName: string,
  modelName: string,
): string | null {
  const prefix = `${brandName} ${modelName}`;
  if (!title.startsWith(prefix)) return title.trim() || null;

  const rest = title.slice(prefix.length).trim();
  return rest === '' ? null : rest;
}

/**
 * Setzt den Anzeigetitel aus Marke, Modell und Motorisierung zusammen.
 *
 * Manche Hersteller tragen den Baureihennamen bereits in der Motorbezeichnung
 * (Mercedes „GLC 220 d 4MATIC"). Ohne diese Prüfung stünde dort
 * „Mercedes-Benz GLC GLC 220 d 4MATIC". Gegenstück zu `variantFromTitle`.
 */
export function buildVehicleTitle(
  brandName: string,
  modelName: string,
  variant?: string | null,
): string {
  const trimmed = variant?.trim();
  if (!trimmed) return `${brandName} ${modelName}`;

  const alreadyNamed = trimmed.toLowerCase().startsWith(`${modelName.toLowerCase()} `);
  return alreadyNamed
    ? `${brandName} ${trimmed}`
    : `${brandName} ${modelName} ${trimmed}`;
}
