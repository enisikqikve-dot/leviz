export type ReviewSignal =
  | 'priceTooLow'
  | 'tooFewPhotos'
  | 'contactInDescription'
  | 'newAccount'
  | 'suspiciousWording';

export type ReviewInput = {
  priceCents: number;
  photoCount: number;
  description: string;
  /** Alter des Kontos in Stunden. */
  accountAgeHours: number;
  /** Untergrenze aus den Plattform-Einstellungen. */
  priceFloorCents: number;
  sellerVerified: boolean;
};

export type ReviewResult = {
  /** Wahr, wenn das Inserat vor der Veröffentlichung geprüft werden soll. */
  needsReview: boolean;
  signals: ReviewSignal[];
};

/**
 * Telefonnummern und E-Mail-Adressen im Beschreibungstext.
 *
 * Zwei Gründe, warum das auffällig ist: Verkäufer versuchen damit an der
 * Plattform vorbei Kontakt aufzunehmen, und es ist das häufigste Merkmal von
 * Betrugsanzeigen, die Interessenten auf einen anderen Kanal locken.
 */
const EMAIL = /[\w.+-]+@[\w-]+\.[a-z]{2,}/i;
const PHONE = /(?:\+?\d[\s\-/.]?){8,}/;

/** Formulierungen, die in der Region typisch für Betrugsversuche sind. */
const SUSPICIOUS = [
  'western union', 'moneygram', 'transferoni parat', 'pagesa paraprake',
  'vorauskasse', 'anzahlung per', 'nur bargeld vorab', 'advance payment',
  'shipping agent', 'agjent transporti',
];

export function assessListing(input: ReviewInput): ReviewResult {
  const signals: ReviewSignal[] = [];
  const text = input.description.toLowerCase();

  if (input.priceCents < input.priceFloorCents) signals.push('priceTooLow');
  if (input.photoCount < 2) signals.push('tooFewPhotos');
  if (EMAIL.test(input.description) || PHONE.test(input.description)) {
    signals.push('contactInDescription');
  }
  if (SUSPICIOUS.some((phrase) => text.includes(phrase))) {
    signals.push('suspiciousWording');
  }
  // Das erste Inserat eines frischen Kontos wird angesehen.
  if (input.accountAgeHours < 24) signals.push('newAccount');

  // Geprüfte Händler sind von der automatischen Prüfung ausgenommen; sie haben
  // ihre Identität bereits nachgewiesen.
  const needsReview = !input.sellerVerified && signals.length > 0;

  return { needsReview, signals };
}
