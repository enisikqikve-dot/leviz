/**
 * Was die API liefert -- der Vertrag, gegen den die App gebaut ist.
 *
 * Bewusst hier ausgeschrieben statt aus den Prisma-Typen des Hauptprojekts
 * abgeleitet: die App soll wissen, was sie bekommt, nicht was die Datenbank
 * gerade hat. Aendert sich die API, aendert sich diese Datei -- sichtbar.
 */

export type Standing = 'below' | 'within' | 'above';

export type VehicleCard = {
  id: string;
  slug: string;
  title: string;
  priceCents: number;
  negotiable: boolean;
  mileageKm: number | null;
  firstRegistration: string | null;
  fuel: string | null;
  transmission: string | null;
  powerKw: number | null;
  bodyType: string | null;
  condition: 'NEW' | 'USED';
  customsStatus: 'CLEARED' | 'NOT_CLEARED' | 'NOT_APPLICABLE';
  plateOrigin: 'RKS' | 'AL' | 'MK' | 'FOREIGN' | 'NONE';
  sellerType: 'PRIVATE' | 'DEALER';
  featuredScore: number;
  publishedAt: string | null;
  brand: { name: string; slug: string };
  model: { name: string; slug: string };
  city: { name: string; slug: string } | null;
  dealer: { companyName: string; slug: string; verification: string } | null;
  images: { url: string; altText: string | null }[];
  standing?: Standing | null;
  distanceKm?: number;
};

export type SearchResponse = {
  items: VehicleCard[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
  center: { name: string; radiusKm: number } | null;
};

export type VehicleDetail = VehicleCard & {
  description: string;
  status: 'ACTIVE' | 'SOLD';
  brandId: string;
  modelId: string;
  driveType: string | null;
  doors: number | null;
  seats: number | null;
  color: string | null;
  emissionClass: string | null;
  consumptionCombined: number | null;
  accidentFree: boolean;
  serviceHistory: boolean;
  ownersCount: number | null;
  steeringSide: 'LEFT' | 'RIGHT';
  importedFrom: { code: string; nameSq: string; nameDe: string; nameEn: string } | null;
  images: { url: string; altText: string | null; position: number }[];
  features: { feature: { slug: string; nameSq: string; nameDe: string; nameEn: string; group: string } }[];
  seller: { id: string; name: string | null; image: string | null; phone: string | null; createdAt: string; verification: string };
  dealer:
    | (VehicleCard['dealer'] & {
        id: string;
        phone: string | null;
        website: string | null;
        logoUrl: string | null;
        addressLine: string | null;
        ratingAvg: number;
        ratingCount: number;
        city: { name: string } | null;
        _count: { vehicles: number };
      })
    | null;
  createdAt: string;
};

export type Estimate = {
  lowCents: number;
  averageCents: number;
  highCents: number;
  sampleSize: number;
  scope: 'model' | 'brand';
};

export type VehicleResponse = {
  vehicle: VehicleDetail;
  similar: VehicleCard[];
  estimate: Estimate | null;
  favorited: boolean;
};

export type Account = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  image: string | null;
  role: 'USER' | 'PRIVATE_SELLER' | 'DEALER' | 'ADMIN' | 'SUPER_ADMIN';
  locale: string;
  dealer: { id: string; slug: string; companyName: string; verified: boolean } | null;
  createdAt: string;
};

export type SessionResponse = {
  user: Account;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

export type Catalog = {
  brands: { slug: string; name: string; count: number }[];
  models: { slug: string; name: string }[];
  cities: { slug: string; name: string; countryCode: string }[];
  countries: { code: string; name: string }[];
  enums: {
    fuel: readonly string[];
    transmission: readonly string[];
    drive: readonly string[];
    body: readonly string[];
    customs: readonly string[];
    plates: readonly string[];
  };
};

export type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

// --- Phase 2: eigene Inserate, Fotos, Profil --------------------------------

export type ListingStatus =
  | 'DRAFT' | 'PENDING_REVIEW' | 'ACTIVE' | 'PAUSED' | 'SOLD' | 'REJECTED' | 'EXPIRED';

/** Ein Eintrag in "Meine Inserate". */
export type OwnListing = {
  id: string;
  slug: string;
  title: string;
  status: ListingStatus;
  priceCents: number;
  viewCount: number;
  inquiryCount: number;
  favoriteCount: number;
  qualityScore: number;
  featuredUntil: string | null;
  expiresAt: string | null;
  updatedAt: string;
  brand: string;
  model: string;
  image: string | null;
};

/** Die Auswahllisten des Assistenten -- dieselben wie auf der Website. */
export type ListingOptions = {
  brands: { slug: string; name: string }[];
  cities: { slug: string; name: string; countryCode: string }[];
  importCountries: { code: string; name: string }[];
  features: { slug: string; label: string; group: string }[];
  photoLimit: number;
};

export type UploadedImage = { key: string; url: string };

/**
 * Was der Assistent sammelt. Der Typ kommt aus dem geteilten Schema des
 * Hauptprojekts -- die App kann gar nichts anderes abschicken, als die
 * Website prueft.
 */
export type { ListingFormValues } from '@/features/listings/schemas';

export type ListingDetail = {
  id: string;
  slug: string;
  title: string;
  status: ListingStatus;
  values: Partial<import('@/features/listings/schemas').ListingFormValues>;
};

export type SaveResult = { id: string; slug: string; needsReview: boolean };
export type PublishResult = { status: 'ACTIVE' | 'PENDING_REVIEW'; slug: string };

export type Profile = {
  name: string;
  email: string | null;
  phone: string | null;
  locale: 'sq' | 'de' | 'en';
  citySlug: string | null;
  hasPassword: boolean;
  cities: { slug: string; name: string; countryCode: string }[];
};

// --- Phase 4: Gespraeche, Suchauftraege, Haendler ----------------------------

export type ConversationVehicle = {
  id: string;
  slug: string;
  title: string;
  status: string;
  priceCents: number;
  image: string | null;
};

export type Conversation = {
  id: string;
  status: 'OPEN' | 'BLOCKED' | string;
  isBuyer: boolean;
  blockedByMe: boolean;
  counterpartName: string;
  lastMessageAt: string;
  unread: boolean;
  vehicle: ConversationVehicle;
  lastMessage: { body: string; createdAt: string; mine: boolean } | null;
};

export type Message = { id: string; body: string; createdAt: string; mine: boolean };

export type ConversationThread = {
  id: string;
  status: 'OPEN' | 'BLOCKED' | string;
  isBuyer: boolean;
  blockedByMe: boolean;
  counterpartName: string;
  vehicle: ConversationVehicle;
  messages: Message[];
};

export type SavedSearch = {
  id: string;
  name: string;
  query: Record<string, string>;
  filterCount: number;
  notifyByEmail: boolean;
  createdAt: string;
  lastCheckedAt: string | null;
  matchCount: number;
  newCount: number;
};

export type DealerCard = {
  id: string;
  slug: string;
  companyName: string;
  logoUrl: string | null;
  description: string | null;
  verified: boolean;
  ratingAvg: number;
  ratingCount: number;
  city: { name: string; slug: string } | null;
  countryCode: string | null;
  vehicleCount: number;
};

export type DealerProfile = {
  id: string;
  slug: string;
  companyName: string;
  description: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  website: string | null;
  phone: string | null;
  publicEmail: string | null;
  addressLine: string | null;
  postalCode: string | null;
  city: { name: string; slug: string } | null;
  country: { code: string; nameSq: string; nameDe: string; nameEn: string } | null;
  openingHours: Record<string, string | null> | null;
  verified: boolean;
  verifiedAt: string | null;
  ratingAvg: number;
  ratingCount: number;
  vehicleCount: number;
  memberSince: string;
  reviews: { id: string; rating: number; title: string | null; body: string | null; verified: boolean; createdAt: string; author: { name: string | null; image: string | null } }[];
};

