import type { FeatureCategory, VehicleCategory } from '@/lib/generated/prisma/enums';

export type SeedFeature = {
  slug: string;
  nameSq: string;
  nameDe: string;
  nameEn: string;
  group: FeatureCategory;
  /** Erscheint direkt im Filter statt hinter mehr anzeigen. */
  popular: boolean;
  categories: VehicleCategory[];
  /** Wahrscheinlichkeit, dass ein Fahrzeug diese Ausstattung hat (0 bis 1). */
  frequency: number;
};

const CARS: VehicleCategory[] = ['CAR', 'VAN_TRUCK'];

/** Kurzform, damit der Katalog lesbar bleibt. */
function f(
  slug: string,
  nameSq: string,
  nameDe: string,
  nameEn: string,
  group: FeatureCategory,
  frequency: number,
  popular = false,
  categories: VehicleCategory[] = CARS,
): SeedFeature {
  return { slug, nameSq, nameDe, nameEn, group, popular, categories, frequency };
}

export const FEATURES: SeedFeature[] = [
  // Multimedia
  f('navigation', 'Navigacion', 'Navigationssystem', 'Navigation', 'MULTIMEDIA', 0.55, true),
  f('apple-carplay', 'Apple CarPlay', 'Apple CarPlay', 'Apple CarPlay', 'MULTIMEDIA', 0.35, true),
  f('android-auto', 'Android Auto', 'Android Auto', 'Android Auto', 'MULTIMEDIA', 0.35, true),
  f('bluetooth', 'Bluetooth', 'Bluetooth', 'Bluetooth', 'MULTIMEDIA', 0.8),
  f('dab-radio', 'Radio DAB', 'DAB-Radio', 'DAB radio', 'MULTIMEDIA', 0.3),
  f('wireless-charging', 'Karikim pa tel', 'Induktives Laden', 'Wireless charging', 'MULTIMEDIA', 0.18),
  f('sound-system', 'Sistem audio premium', 'Premium-Soundsystem', 'Premium sound system', 'MULTIMEDIA', 0.2),

  // Assistenz
  f('parking-sensors', 'Sensorë parkimi', 'Einparkhilfe', 'Parking sensors', 'ASSISTANCE', 0.6, true),
  f('rear-camera', 'Kamerë e pasme', 'Rückfahrkamera', 'Rear camera', 'ASSISTANCE', 0.45, true),
  f('camera-360', 'Kamerë 360°', '360-Grad-Kamera', '360 camera', 'ASSISTANCE', 0.12),
  f('cruise-control', 'Cruise control', 'Tempomat', 'Cruise control', 'ASSISTANCE', 0.6, true),
  f('adaptive-cruise', 'Cruise control adaptiv', 'Adaptiver Tempomat', 'Adaptive cruise control', 'ASSISTANCE', 0.2, true),
  f('blind-spot', 'Asistent i këndit të vdekur', 'Totwinkel-Assistent', 'Blind spot assist', 'ASSISTANCE', 0.22, true),
  f('lane-assist', 'Asistent i korsisë', 'Spurhalteassistent', 'Lane assist', 'ASSISTANCE', 0.25, true),
  f('keyless', 'Keyless Go', 'Keyless Go', 'Keyless entry', 'ASSISTANCE', 0.3, true),
  f('head-up-display', 'Head-up display', 'Head-up-Display', 'Head-up display', 'ASSISTANCE', 0.1),
  f('auto-parking', 'Parkim automatik', 'Parkassistent', 'Park assist', 'ASSISTANCE', 0.14),

  // Komfort
  f('climate-control', 'Klimë automatike', 'Klimaautomatik', 'Climate control', 'COMFORT', 0.7, true),
  f('heated-seats', 'Ulëse me ngrohje', 'Sitzheizung', 'Heated seats', 'COMFORT', 0.45, true),
  f('ventilated-seats', 'Ulëse me ajrosje', 'Sitzbelüftung', 'Ventilated seats', 'COMFORT', 0.08),
  f('electric-seats', 'Ulëse elektrike', 'Elektrische Sitze', 'Electric seats', 'COMFORT', 0.25),
  f('heated-steering', 'Timon me ngrohje', 'Lenkradheizung', 'Heated steering wheel', 'COMFORT', 0.15),
  f('start-stop', 'Start-Stop', 'Start-Stopp-Automatik', 'Start-stop system', 'COMFORT', 0.55),
  f('electric-tailgate', 'Bagazh elektrik', 'Elektrische Heckklappe', 'Electric tailgate', 'COMFORT', 0.18),
  f('air-suspension', 'Suspension ajri', 'Luftfederung', 'Air suspension', 'COMFORT', 0.07),

  // Sicherheit
  f('isofix', 'Isofix', 'Isofix', 'Isofix', 'SAFETY', 0.6),
  f('abs', 'ABS', 'ABS', 'ABS', 'SAFETY', 0.97),
  f('esp', 'ESP', 'ESP', 'ESP', 'SAFETY', 0.9),
  f('emergency-braking', 'Frenim emergjent', 'Notbremsassistent', 'Emergency braking', 'SAFETY', 0.28),
  f('tyre-pressure', 'Kontroll i presionit', 'Reifendruckkontrolle', 'Tyre pressure monitor', 'SAFETY', 0.35),

  // Aussen
  f('led-lights', 'Drita LED', 'LED-Scheinwerfer', 'LED headlights', 'EXTERIOR', 0.4, true),
  f('matrix-led', 'Matrix LED', 'Matrix-LED', 'Matrix LED', 'EXTERIOR', 0.12, true),
  f('xenon', 'Xenon', 'Xenon', 'Xenon', 'EXTERIOR', 0.25),
  f('panoramic-roof', 'Çati panoramike', 'Panoramadach', 'Panoramic roof', 'EXTERIOR', 0.2, true),
  f('sunroof', 'Çati diellore', 'Schiebedach', 'Sunroof', 'EXTERIOR', 0.18, true),
  f('tow-bar', 'Tërheqës rimorkio', 'Anhängerkupplung', 'Tow bar', 'EXTERIOR', 0.22, true),
  f('alloy-wheels', 'Disqe alumini', 'Leichtmetallfelgen', 'Alloy wheels', 'EXTERIOR', 0.75),
  f('roof-rails', 'Shina çatie', 'Dachreling', 'Roof rails', 'EXTERIOR', 0.3),
  f('metallic-paint', 'Ngjyrë metalike', 'Metallic-Lackierung', 'Metallic paint', 'EXTERIOR', 0.7),

  // Innen
  f('leather', 'Tapiceri lëkure', 'Lederausstattung', 'Leather upholstery', 'INTERIOR', 0.3, true),
  f('sport-seats', 'Ulëse sportive', 'Sportsitze', 'Sport seats', 'INTERIOR', 0.2),
  f('ambient-light', 'Ndriçim ambienti', 'Ambientebeleuchtung', 'Ambient lighting', 'INTERIOR', 0.25),
  f('multifunction-wheel', 'Timon multifunksional', 'Multifunktionslenkrad', 'Multifunction steering wheel', 'INTERIOR', 0.7),
  f('digital-cockpit', 'Kokpit digjital', 'Digitales Cockpit', 'Digital cockpit', 'INTERIOR', 0.22),
];

export const POPULAR_FEATURES = FEATURES.filter((feature) => feature.popular);
