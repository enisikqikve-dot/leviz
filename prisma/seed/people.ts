/**
 * Namen fuer die Beispieldaten. Sie sind fuer die Region typisch, aber frei
 * erfunden — es werden keine Daten realer Personen verwendet.
 */

export const FIRST_NAMES_M = [
  'Arben', 'Agron', 'Astrit', 'Bekim', 'Besnik', 'Blerim', 'Burim', 'Dardan',
  'Driton', 'Endrit', 'Fatmir', 'Fisnik', 'Flamur', 'Gazmend', 'Genc', 'Granit',
  'Ilir', 'Jeton', 'Kreshnik', 'Kujtim', 'Labinot', 'Leotrim', 'Liridon',
  'Mentor', 'Muhamet', 'Naim', 'Nderim', 'Petrit', 'Rinor', 'Sokol', 'Valon',
  'Vullnet', 'Ylber', 'Shpend', 'Altin',
];

export const FIRST_NAMES_F = [
  'Adelina', 'Albana', 'Arta', 'Besa', 'Blerta', 'Donika', 'Drita', 'Edona',
  'Elira', 'Fatime', 'Fjolla', 'Gentiana', 'Hana', 'Jehona', 'Kaltrina',
  'Leonora', 'Liridona', 'Mirlinda', 'Nora', 'Rina', 'Shpresa', 'Teuta',
  'Valbona', 'Vlora', 'Yllka',
];

export const LAST_NAMES = [
  'Krasniqi', 'Berisha', 'Gashi', 'Hoxha', 'Shala', 'Morina', 'Rexhepi',
  'Bytyqi', 'Kelmendi', 'Zeqiri', 'Ahmeti', 'Bajrami', 'Dervishi', 'Halili',
  'Ibrahimi', 'Jashari', 'Kastrati', 'Latifi', 'Maliqi', 'Nuhiu', 'Osmani',
  'Rrahmani', 'Sylejmani', 'Ujkani', 'Veseli', 'Xhemajli', 'Zeneli', 'Musliu',
  'Salihu', 'Aliu', 'Selimi', 'Haziri', 'Bajraktari', 'Demiri', 'Ferizi',
];

export type SeedDealer = {
  slug: string;
  name: string;
  citySlug: string;
  verified: boolean;
  /** Gewicht fuer die Anzahl der Fahrzeuge im Bestand. */
  size: 'small' | 'medium' | 'large';
  description: string;
};

export const DEALERS: SeedDealer[] = [
  { slug: 'auto-krasniqi', name: 'Auto Krasniqi', citySlug: 'prishtine', verified: true, size: 'large',
    description: 'Autosallon familjar në Prishtinë që nga viti 2009. Specializuar në vetura gjermane të importuara direkt, të gjitha të doganuara dhe me histori servisi.' },
  { slug: 'dardania-auto', name: 'Dardania Auto', citySlug: 'prishtine', verified: true, size: 'large',
    description: 'Importues i licencuar me stok të vazhdueshëm prej mbi 60 veturash. Ofrojmë garanci 6 mujore dhe ndihmë me regjistrimin.' },
  { slug: 'elita-motors', name: 'Elita Motors', citySlug: 'prishtine', verified: true, size: 'medium',
    description: 'Vetura premium nga Gjermania dhe Zvicra. Çdo veturë kalon kontroll teknik para shitjes.' },
  { slug: 'autostar-prizren', name: 'AutoStar Prizren', citySlug: 'prizren', verified: true, size: 'large',
    description: 'Salloni më i madh në rajonin e Prizrenit. Mbi 15 vjet përvojë në importin e veturave nga Evropa Perëndimore.' },
  { slug: 'auto-gashi', name: 'Auto Gashi', citySlug: 'prizren', verified: true, size: 'medium',
    description: 'Vetura të kontrolluara me çmime të drejta. Mundësi këmbimi dhe financimi përmes bankave partnere.' },
  { slug: 'premium-auto-peje', name: 'Premium Auto Pejë', citySlug: 'peje', verified: true, size: 'medium',
    description: 'Specializuar në SUV dhe vetura familjare. Të gjitha veturat vijnë me libër servisi të plotë.' },
  { slug: 'auto-berisha', name: 'Auto Berisha', citySlug: 'gjakove', verified: true, size: 'medium',
    description: 'Autosallon i besuar në Gjakovë. Importim me porosi sipas kërkesës së klientit brenda tri javësh.' },
  { slug: 'eurocar-ferizaj', name: 'EuroCar Ferizaj', citySlug: 'ferizaj', verified: true, size: 'medium',
    description: 'Vetura të doganuara dhe të padoganuara. Konsulencë falas për procedurat doganore.' },
  { slug: 'motors-gjilan', name: 'Motors Gjilan', citySlug: 'gjilan', verified: false, size: 'small',
    description: 'Salloni ynë ofron vetura të përdorura me kilometrazh të verifikuar dhe çmime konkurruese.' },
  { slug: 'auto-shala', name: 'Auto Shala', citySlug: 'mitrovice', verified: true, size: 'small',
    description: 'Biznes familjar me traditë njëzetvjeçare. Vetura kryesisht nga Zvicra dhe Austria.' },
  { slug: 'kosova-motors', name: 'Kosova Motors', citySlug: 'fushe-kosove', verified: true, size: 'large',
    description: 'Qendra jonë ofron shitje, servis dhe regjistrim në një vend. Garanci deri në 12 muaj.' },
  { slug: 'alba-cars-tirane', name: 'Alba Cars', citySlug: 'tirane', verified: true, size: 'large',
    description: 'Salloni kryesor në Tiranë me mbi 80 vetura në stok. Import direkt nga Gjermania dhe Italia.' },
  { slug: 'illyria-motors', name: 'Illyria Motors', citySlug: 'tirane', verified: true, size: 'medium',
    description: 'Vetura premium dhe SUV nga Evropa. Ofrojmë provë në rrugë dhe kontroll të pavarur teknik.' },
  { slug: 'adria-auto-durres', name: 'Adria Auto', citySlug: 'durres', verified: true, size: 'medium',
    description: 'Importues me përvojë nga porti i Durrësit. Çmime të favorshme për vetura direkt nga Italia.' },
  { slug: 'auto-center-vlore', name: 'Auto Center Vlorë', citySlug: 'vlore', verified: false, size: 'small',
    description: 'Vetura të përdorura me çmime të arsyeshme për tregun vendor.' },
  { slug: 'shkodra-auto', name: 'Shkodra Auto', citySlug: 'shkoder', verified: true, size: 'small',
    description: 'Salloni ynë specializohet në vetura kompakte dhe ekonomike për qytet.' },
  { slug: 'autohouse-tetove', name: 'AutoHouse Tetovë', citySlug: 'tetove', verified: true, size: 'medium',
    description: 'Autosallon në Tetovë me vetura nga Gjermania dhe Zvicra. Ndihmë me dokumentacionin.' },
  { slug: 'balkan-auto-shkup', name: 'Balkan Auto', citySlug: 'shkup', verified: true, size: 'medium',
    description: 'Mbi dhjetë vjet në treg. Vetura të kontrolluara me garanci dhe mundësi financimi.' },
  { slug: 'schwaben-automobile', name: 'Schwaben Automobile', citySlug: 'stuttgart', verified: true, size: 'large',
    description: 'Deutscher Exporthändler mit Spezialisierung auf den Balkanmarkt. Alle Fahrzeuge mit Serviceheft, Export- und Zollabwicklung inklusive.' },
  { slug: 'helvetia-cars', name: 'Helvetia Cars', citySlug: 'zuerich', verified: true, size: 'medium',
    description: 'Schweizer Fahrzeuge in gepflegtem Zustand, überwiegend Erstbesitz. Export in den Kosovo und nach Albanien auf Wunsch komplett organisiert.' },
];
