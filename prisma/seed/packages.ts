import type { PackageInterval, PackageTier } from '@/lib/generated/prisma/enums';

export type SeedPackage = {
  tier: PackageTier;
  nameSq: string; nameDe: string; nameEn: string;
  descriptionSq: string; descriptionDe: string; descriptionEn: string;
  priceCents: number;
  interval: PackageInterval;
  listingLimit: number | null;
  listingDurationDays: number;
  photoLimit: number;
  featuredScore: number;
  featuredDays: number;
  hasStatistics: boolean;
  hasBulkTools: boolean;
  hasApiAccess: boolean;
  isDealerPackage: boolean;
  sortOrder: number;
};

/**
 * Startwerte. Alle Felder sind spaeter im Verwaltungsbereich aenderbar, damit
 * eine Preisaenderung keinen Eingriff in den Code verlangt.
 */
export const PACKAGES: SeedPackage[] = [
  {
    tier: 'FREE',
    nameSq: 'Falas', nameDe: 'Kostenlos', nameEn: 'Free',
    descriptionSq: 'Një shpallje aktive, e mjaftueshme për të shitur veturën tënde.',
    descriptionDe: 'Eine aktive Anzeige — genug, um dein Fahrzeug zu verkaufen.',
    descriptionEn: 'One active listing — enough to sell your vehicle.',
    priceCents: 0, interval: 'ONE_TIME',
    listingLimit: 1, listingDurationDays: 45, photoLimit: 10,
    featuredScore: 0, featuredDays: 0,
    hasStatistics: false, hasBulkTools: false, hasApiAccess: false,
    isDealerPackage: false, sortOrder: 1,
  },
  {
    tier: 'PREMIUM',
    nameSq: 'Premium', nameDe: 'Premium', nameEn: 'Premium',
    descriptionSq: 'Shpallja jote më lart në rezultate për shtatë ditë.',
    descriptionDe: 'Deine Anzeige sieben Tage lang weiter oben in den Ergebnissen.',
    descriptionEn: 'Your listing higher in the results for seven days.',
    priceCents: 999, interval: 'ONE_TIME',
    listingLimit: 3, listingDurationDays: 60, photoLimit: 20,
    featuredScore: 40, featuredDays: 7,
    hasStatistics: true, hasBulkTools: false, hasApiAccess: false,
    isDealerPackage: false, sortOrder: 2,
  },
  {
    tier: 'PREMIUM_PLUS',
    nameSq: 'Premium Plus', nameDe: 'Premium Plus', nameEn: 'Premium Plus',
    descriptionSq: 'Vend i theksuar në ballinë dhe 14 ditë në krye të rezultateve.',
    descriptionDe: 'Hervorgehoben auf der Startseite und 14 Tage ganz oben.',
    descriptionEn: 'Featured on the homepage and 14 days at the top.',
    priceCents: 1999, interval: 'ONE_TIME',
    listingLimit: 5, listingDurationDays: 90, photoLimit: 30,
    featuredScore: 80, featuredDays: 14,
    hasStatistics: true, hasBulkTools: false, hasApiAccess: false,
    isDealerPackage: false, sortOrder: 3,
  },
  {
    tier: 'DEALER_STARTER',
    nameSq: 'Shitës Fillestar', nameDe: 'Händler Starter', nameEn: 'Dealer Starter',
    descriptionSq: 'Deri në 25 vetura, profil i autosallonit dhe statistika.',
    descriptionDe: 'Bis zu 25 Fahrzeuge, Händlerprofil und Statistiken.',
    descriptionEn: 'Up to 25 vehicles, dealer profile and statistics.',
    priceCents: 4900, interval: 'MONTHLY',
    listingLimit: 25, listingDurationDays: 120, photoLimit: 25,
    featuredScore: 10, featuredDays: 0,
    hasStatistics: true, hasBulkTools: false, hasApiAccess: false,
    isDealerPackage: true, sortOrder: 4,
  },
  {
    tier: 'DEALER_PRO',
    nameSq: 'Shitës Pro', nameDe: 'Händler Pro', nameEn: 'Dealer Pro',
    descriptionSq: 'Deri në 100 vetura, veprime masive dhe raporte të plota.',
    descriptionDe: 'Bis zu 100 Fahrzeuge, Massenaktionen und volle Auswertungen.',
    descriptionEn: 'Up to 100 vehicles, bulk actions and full reporting.',
    priceCents: 9900, interval: 'MONTHLY',
    listingLimit: 100, listingDurationDays: 180, photoLimit: 40,
    featuredScore: 25, featuredDays: 0,
    hasStatistics: true, hasBulkTools: true, hasApiAccess: false,
    isDealerPackage: true, sortOrder: 5,
  },
  {
    tier: 'DEALER_ENTERPRISE',
    nameSq: 'Shitës Enterprise', nameDe: 'Händler Enterprise', nameEn: 'Dealer Enterprise',
    descriptionSq: 'Vetura pa kufi, importim me CSV dhe qasje në API.',
    descriptionDe: 'Unbegrenzt Fahrzeuge, CSV-Import und API-Zugang.',
    descriptionEn: 'Unlimited vehicles, CSV import and API access.',
    priceCents: 19900, interval: 'MONTHLY',
    listingLimit: null, listingDurationDays: 365, photoLimit: 60,
    featuredScore: 40, featuredDays: 0,
    hasStatistics: true, hasBulkTools: true, hasApiAccess: true,
    isDealerPackage: true, sortOrder: 6,
  },
];
