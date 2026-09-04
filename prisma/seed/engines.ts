import type { FuelType } from '@/lib/generated/prisma/enums';

import type { EngineStyle } from './brands';

export type SeedEngine = {
  name: string;
  fuel: FuelType;
  powerKw: number;
  displacementCcm: number;
  /**
   * Modelle, zu denen diese Motorisierung passt. Ohne Angabe passt sie zu
   * jedem Modell der Marke. Verhindert Unsinn wie einen BMW 5er mit 318d.
   */
  models?: string[];
};

/** Kurzform: Name, Kraftstoff, Leistung in kW, Hubraum in ccm, passende Modelle. */
type E = [string, FuelType, number, number, string[]?];

function build(rows: E[]): SeedEngine[] {
  return rows.map(([name, fuel, powerKw, displacementCcm, models]) => ({
    name, fuel, powerKw, displacementCcm, ...(models ? { models } : {}),
  }));
}

const BMW_SMALL = ['1er', 'x1'];
const BMW_MID = ['3er', '4er', 'x3'];
const BMW_LARGE = ['5er', 'x5', 'x6'];
const BMW_TOP = ['7er'];

const MB_COMPACT = ['a-klasse', 'b-klasse'];
const MB_MID = ['c-klasse'];
const MB_LARGE = ['e-klasse'];
const MB_TOP = ['s-klasse'];
const MB_VAN = ['vito', 'sprinter'];

/** Groessere Modelle der Allianz; die grossen dCi passen nur dorthin. */
const RENAULT_LARGE = [
  'megane', 'scenic', 'kadjar', 'captur', 'trafic', 'master', 'logan', 'duster',
  'dokker', 'qashqai', 'x-trail', 'navara',
];

/** Grosse Fahrzeuge im Konzernbaukasten; nur dort steckt ein V6. */
const VW_LARGE = ['touareg', 'q7', 'a8', 'a6', 'a5', 'arteon', 'crafter', 'transporter'];

/**
 * Motorisierungen je Marke.
 *
 * Die Bezeichnungen sind Markenzeichen: TDI gehoert zu Volkswagen, dCi zu
 * Renault, CDTI zu Opel. Werden mehrere Marken in eine Gruppe geworfen,
 * entstehen Angaben wie ein Opel mit Ford-Motor — auf einem Fahrzeugmarktplatz
 * sofort als falsch erkennbar. Marken teilen sich eine Gruppe nur dann, wenn
 * sie tatsaechlich dieselben Motoren und Bezeichnungen fuehren.
 *
 * Der Dieselanteil ist durchgehend hoch: im Kosovo und in Albanien sind
 * Dieselfahrzeuge aus deutschen Importen mit Abstand am haeufigsten.
 */
export const ENGINES: Record<EngineStyle, SeedEngine[]> = {
  // Volkswagen, Audi, Škoda, SEAT
  vw: build([
    ['1.6 TDI', 'DIESEL', 77, 1598], ['1.6 TDI', 'DIESEL', 85, 1598],
    ['2.0 TDI', 'DIESEL', 103, 1968], ['2.0 TDI', 'DIESEL', 110, 1968],
    ['2.0 TDI', 'DIESEL', 140, 1968], ['1.9 TDI', 'DIESEL', 77, 1896],
    ['3.0 TDI', 'DIESEL', 180, 2967, VW_LARGE],
    ['2.0 TDI quattro', 'DIESEL', 130, 1968, VW_LARGE],
    ['1.4 TSI', 'PETROL', 92, 1395], ['1.5 TSI', 'PETROL', 110, 1498],
    ['2.0 TSI', 'PETROL', 140, 1984], ['1.2 TSI', 'PETROL', 77, 1197],
    ['1.0 TSI', 'PETROL', 70, 999], ['1.4 eHybrid', 'PLUGIN_HYBRID', 110, 1395],
    ['e-Motor', 'ELECTRIC', 150, 0, ['id-4', 'e-tron']],
  ]),

  // BMW und MINI
  bmw: build([
    ['116d', 'DIESEL', 85, 1496, BMW_SMALL], ['118d', 'DIESEL', 110, 1995, BMW_SMALL],
    ['120d', 'DIESEL', 140, 1995, BMW_SMALL], ['118i', 'PETROL', 100, 1499, BMW_SMALL],
    ['318d', 'DIESEL', 105, 1995, BMW_MID], ['320d', 'DIESEL', 140, 1995, BMW_MID],
    ['320d xDrive', 'DIESEL', 140, 1995, BMW_MID], ['330d', 'DIESEL', 190, 2993, BMW_MID],
    ['320i', 'PETROL', 135, 1998, BMW_MID], ['xDrive20d', 'DIESEL', 140, 1995, BMW_MID],
    ['520d', 'DIESEL', 140, 1995, BMW_LARGE], ['525d', 'DIESEL', 160, 1995, BMW_LARGE],
    ['530d', 'DIESEL', 190, 2993, BMW_LARGE], ['530i', 'PETROL', 185, 1998, BMW_LARGE],
    ['xDrive30d', 'DIESEL', 195, 2993, BMW_LARGE],
    ['730d', 'DIESEL', 195, 2993, BMW_TOP], ['740d', 'DIESEL', 235, 2993, BMW_TOP],
    ['eDrive', 'ELECTRIC', 125, 0, ['i3']],
    ['Cooper D', 'DIESEL', 85, 1496, ['cooper', 'countryman', 'clubman']],
    ['Cooper S', 'PETROL', 141, 1998, ['cooper', 'countryman', 'clubman']],
  ]),

  // Mercedes-Benz und smart
  mercedes: build([
    ['A 180 d', 'DIESEL', 85, 1461, MB_COMPACT], ['A 200 d', 'DIESEL', 110, 2143, MB_COMPACT],
    ['A 200', 'PETROL', 120, 1332, MB_COMPACT],
    ['C 200 CDI', 'DIESEL', 100, 2143, MB_MID], ['C 220 d', 'DIESEL', 143, 1950, MB_MID],
    ['C 250 d', 'DIESEL', 150, 2143, MB_MID], ['C 180', 'PETROL', 115, 1595, MB_MID],
    ['C 300 e', 'PLUGIN_HYBRID', 235, 1991, MB_MID],
    ['E 220 d', 'DIESEL', 143, 1950, MB_LARGE], ['E 250 CDI', 'DIESEL', 150, 2143, MB_LARGE],
    ['E 350 d', 'DIESEL', 190, 2987, MB_LARGE], ['E 200', 'PETROL', 135, 1991, MB_LARGE],
    ['S 350 d', 'DIESEL', 210, 2925, MB_TOP], ['S 400 d', 'DIESEL', 250, 2925, MB_TOP],
    ['GLC 220 d 4MATIC', 'DIESEL', 143, 1950, ['glc']],
    ['GLE 250 d 4MATIC', 'DIESEL', 150, 2143, ['gle']],
    ['GLE 350 d 4MATIC', 'DIESEL', 190, 2987, ['gle']],
    ['GLA 200 d', 'DIESEL', 100, 2143, ['gla']],
    ['ML 350 CDI', 'DIESEL', 190, 2987, ['ml']],
    ['110 CDI', 'DIESEL', 75, 1598, MB_VAN], ['116 CDI', 'DIESEL', 120, 2143, MB_VAN],
    ['316 CDI', 'DIESEL', 120, 2143, MB_VAN],
    ['0.9 turbo', 'PETROL', 66, 898, ['fortwo', 'forfour']],
    ['1.0', 'PETROL', 52, 999, ['fortwo', 'forfour']],
  ]),

  // Renault, Dacia und Nissan — dCi ist die gemeinsame Bezeichnung der Allianz.
  renault: build([
    ['1.5 dCi', 'DIESEL', 66, 1461], ['1.5 dCi', 'DIESEL', 81, 1461],
    ['1.6 dCi', 'DIESEL', 96, 1598],
    ['1.9 dCi', 'DIESEL', 88, 1870, RENAULT_LARGE],
    ['2.0 dCi', 'DIESEL', 110, 1995, RENAULT_LARGE],
    ['2.3 dCi', 'DIESEL', 107, 2298, RENAULT_LARGE],
    ['1.2 TCe', 'PETROL', 85, 1198], ['1.0 TCe', 'PETROL', 66, 999],
    ['1.3 TCe', 'PETROL', 103, 1332], ['1.6 16V', 'PETROL', 82, 1598],
    ['1.2 DIG-T', 'PETROL', 85, 1197, ['qashqai', 'juke', 'micra']],
  ]),

  // Peugeot und Citroën — HDi und BlueHDi kommen beide aus dem PSA-Konzern.
  psa: build([
    ['1.6 HDi', 'DIESEL', 82, 1560], ['1.6 HDi', 'DIESEL', 68, 1560],
    ['2.0 HDi', 'DIESEL', 100, 1997], ['1.5 BlueHDi', 'DIESEL', 96, 1499],
    ['2.0 BlueHDi', 'DIESEL', 110, 1997], ['2.2 HDi', 'DIESEL', 96, 2179],
    ['1.2 PureTech', 'PETROL', 81, 1199], ['1.2 THP', 'PETROL', 96, 1199],
    ['1.4 16V', 'PETROL', 65, 1360], ['1.6 VTi', 'PETROL', 88, 1598],
  ]),

  // Fiat und Iveco
  fiat: build([
    ['1.3 Multijet', 'DIESEL', 70, 1248, ['panda', '500', 'punto', 'tipo']],
    ['1.2 8V', 'PETROL', 51, 1242, ['panda', '500', 'punto']],
    ['1.4 16V', 'PETROL', 70, 1368, ['panda', '500', 'punto', 'tipo']],
    ['1.6 Multijet', 'DIESEL', 88, 1598],
    ['2.3 Multijet', 'DIESEL', 96, 2287, ['doblo', 'ducato', 'daily']],
    ['3.0 F1C', 'DIESEL', 130, 2998, ['daily', 'eurocargo']],
  ]),

  // Alfa Romeo
  alfa: build([
    ['1.6 JTDM', 'DIESEL', 88, 1598], ['2.0 JTDM', 'DIESEL', 110, 1956],
    ['2.2 JTDM', 'DIESEL', 140, 2143], ['1.9 JTD', 'DIESEL', 88, 1910],
    ['1.4 TB', 'PETROL', 88, 1368], ['2.0 TB', 'PETROL', 147, 1995],
  ]),

  // Toyota und Lexus
  toyota: build([
    ['2.0 D-4D', 'DIESEL', 93, 1998], ['2.2 D-4D', 'DIESEL', 110, 2231],
    ['1.4 D-4D', 'DIESEL', 66, 1364], ['2.8 D-4D', 'DIESEL', 130, 2755, ['hilux', 'land-cruiser']],
    ['1.8 VVT-i', 'PETROL', 108, 1798], ['1.33 VVT-i', 'PETROL', 73, 1329],
    ['1.5 Hybrid', 'HYBRID_PETROL', 74, 1497, ['yaris', 'corolla', 'c-hr']],
    ['1.8 Hybrid', 'HYBRID_PETROL', 90, 1798, ['corolla', 'c-hr', 'nx']],
    ['2.5 Hybrid AWD', 'HYBRID_PETROL', 163, 2487, ['rav4', 'nx', 'rx']],
  ]),

  // Hyundai und Kia
  hyundai: build([
    ['1.6 CRDi', 'DIESEL', 100, 1582], ['1.7 CRDi', 'DIESEL', 85, 1685],
    ['2.0 CRDi', 'DIESEL', 136, 1995], ['2.2 CRDi', 'DIESEL', 145, 2199, ['santa-fe', 'sorento']],
    ['1.4 CRDi', 'DIESEL', 66, 1396], ['1.6 GDI', 'PETROL', 99, 1591],
    ['1.0 T-GDI', 'PETROL', 74, 998], ['1.6 Hybrid', 'HYBRID_PETROL', 104, 1580, ['niro', 'kona']],
  ]),

  // Mazda
  mazda: build([
    ['1.6 SkyActiv-D', 'DIESEL', 77, 1598], ['2.2 SkyActiv-D', 'DIESEL', 110, 2191],
    ['1.5 SkyActiv-D', 'DIESEL', 77, 1499], ['2.0 SkyActiv-G', 'PETROL', 121, 1998],
    ['1.5 SkyActiv-G', 'PETROL', 88, 1496],
  ]),

  // Honda
  honda: build([
    ['1.6 i-DTEC', 'DIESEL', 88, 1597], ['2.2 i-CTDi', 'DIESEL', 103, 2204],
    ['2.2 i-DTEC', 'DIESEL', 110, 2199], ['1.8 i-VTEC', 'PETROL', 104, 1799],
    ['1.4 i-VTEC', 'PETROL', 73, 1339],
  ]),

  // Mitsubishi und Suzuki
  mitsubishi: build([
    ['2.0 DI-D', 'DIESEL', 110, 1968], ['2.2 DI-D', 'DIESEL', 110, 2268],
    ['2.4 DI-D', 'DIESEL', 133, 2442, ['l200', 'pajero']],
    ['1.6 DDiS', 'DIESEL', 88, 1598], ['1.6 MIVEC', 'PETROL', 86, 1590],
    ['1.4 VVT', 'PETROL', 70, 1373], ['2.4 PHEV', 'PLUGIN_HYBRID', 165, 2360, ['outlander']],
  ]),

  // Ford
  ford: build([
    ['1.5 TDCi', 'DIESEL', 88, 1499], ['1.6 TDCi', 'DIESEL', 85, 1560],
    ['2.0 TDCi', 'DIESEL', 110, 1997], ['2.0 EcoBlue', 'DIESEL', 125, 1995],
    ['2.2 TDCi', 'DIESEL', 92, 2198, ['transit', 'ranger']],
    ['1.0 EcoBoost', 'PETROL', 74, 999], ['1.5 EcoBoost', 'PETROL', 110, 1498],
  ]),

  // Opel und Chevrolet — beide fuehrten die CDTI-Bezeichnung.
  opel: build([
    ['1.3 CDTI', 'DIESEL', 70, 1248], ['1.6 CDTI', 'DIESEL', 81, 1598],
    ['1.7 CDTI', 'DIESEL', 92, 1686], ['2.0 CDTI', 'DIESEL', 125, 1956],
    ['1.4 Turbo', 'PETROL', 103, 1364], ['1.2 Turbo', 'PETROL', 96, 1199],
    ['1.6 16V', 'PETROL', 85, 1598],
  ]),

  // Volvo — Motoren tragen einen Code statt eines Hubraums.
  volvo: build([
    ['D2', 'DIESEL', 88, 1560], ['D3', 'DIESEL', 110, 1969],
    ['D4', 'DIESEL', 140, 1969], ['D5', 'DIESEL', 151, 2400],
    ['T4', 'PETROL', 140, 1969], ['T5', 'PETROL', 180, 1969],
  ]),

  // Land Rover und Jaguar
  jlr: build([
    ['2.0 TD4', 'DIESEL', 110, 1999], ['2.0 SD4', 'DIESEL', 177, 1999],
    ['2.0 D180', 'DIESEL', 132, 1999], ['3.0 TDV6', 'DIESEL', 190, 2993],
    ['2.0 Si4', 'PETROL', 177, 1999],
  ]),

  // Porsche
  porsche: build([
    ['3.0 TDI V6', 'DIESEL', 190, 2967, ['cayenne', 'macan', 'panamera']],
    ['3.0 V6', 'PETROL', 250, 2995, ['cayenne', 'macan', 'panamera']],
    ['3.0 Carrera', 'PETROL', 283, 2981, ['911']],
  ]),

  // Rein elektrische Marken
  ev: build([
    ['Standard Range', 'ELECTRIC', 190, 0], ['Long Range', 'ELECTRIC', 220, 0],
    ['Performance', 'ELECTRIC', 340, 0],
  ]),

  // Marken ohne eigene, verbreitete Bezeichnung
  generic: build([
    ['2.0 Diesel', 'DIESEL', 110, 1998], ['2.2 Diesel', 'DIESEL', 130, 2179],
    ['1.6 Diesel', 'DIESEL', 85, 1598], ['2.0 Benzin', 'PETROL', 125, 1998],
    ['1.6 Benzin', 'PETROL', 90, 1598], ['2.0 Boxer Diesel', 'DIESEL', 110, 1998, ['forester', 'outback', 'impreza']],
  ]),
};

export const TOTAL_ENGINES = Object.values(ENGINES).reduce((n, list) => n + list.length, 0);

/**
 * Mindesthubraum je Karosserieform in ccm.
 *
 * Verhindert allgemein, was sonst Modell fuer Modell aufgezaehlt werden
 * muesste: ein 1,2-Liter-Benziner in einem Pickup oder Kleinbus. Elektro- und
 * Hybridantriebe sind ausgenommen, sie haben keinen vergleichbaren Hubraum.
 */
const MIN_DISPLACEMENT: Record<string, number> = {
  PICKUP: 1900, TRUCK: 2200, MINIBUS: 1900, VAN: 1500, SUV: 1400, CHASSIS: 2000,
};

/**
 * Hoechsthubraum je Modell. Das Gegenstueck zur Mindestregel: Kleinwagen
 * bekamen nie die grossen Maschinen der Marke. Ohne diese Liste entstuende
 * eine "Skoda Fabia 2.0 TDI", die es nie gab.
 */
const MAX_DISPLACEMENT_MODEL: Record<string, number> = {
  // Kleinstwagen
  '500': 1400, forfour: 1400, fortwo: 1000, panda: 1400, aveo: 1400,
  c1: 1400, up: 1200, twingo: 1200, i20: 1400, micra: 1500, jazz: 1500,
  yaris: 1500, swift: 1400, rio: 1400, punto: 1400, sandero: 1600,
  // Kleinwagen
  fabia: 1600, polo: 1600, corsa: 1600, ibiza: 1600, fiesta: 1600,
  clio: 1600, '206': 1600, '208': 1600, c3: 1600, a1: 1600, mazda3: 2200,
  // Kompakte Gelaendewagen mit kleinen Motoren
  arona: 1600, 'c-hr': 1800, 'cx-3': 1600, mokka: 1700, juke: 1600,
  jimny: 1500, 's-cross': 1600, vitara: 1600, 'range-rover-evoque': 2200,
};

/**
 * Modelle, die es ausschliesslich mit Elektroantrieb gab. Ohne diese Liste
 * greifen die nicht modellgebundenen Verbrenner der Marke und es entstuende
 * ein "Volkswagen ID.4 2.0 TDI".
 */
const ELECTRIC_ONLY = new Set([
  'id-4', 'e-tron', 'i3', 'model-3', 'model-s', 'model-y', 'leaf', 'zoe',
  'e-golf', 'corsa-e', 'mokka-e', 'ex30', 'ioniq-5', 'ev6',
]);

/**
 * Mindesthubraum je Modell. Die Karosserieform allein genuegt nicht: eine
 * Oberklasse-Limousine ist eine SEDAN wie ein Kleinwagen auch. Ohne diese
 * Regel entstuenden Kombinationen wie "Audi A8 1.4 TSI", die es nie gab.
 */
const MIN_DISPLACEMENT_MODEL: Record<string, number> = {
  // Obere Mittelklasse und Oberklasse
  a5: 1900, a6: 1900, a8: 2500, arteon: 1900,
  q7: 2500, touareg: 2500,
  panamera: 2900, cayenne: 2900,
  xf: 1900, 'range-rover-sport': 2500, discovery: 2500, defender: 1900,
  s60: 1500, v60: 1500, v70: 1900, xc60: 1500, xc90: 1900,
  // Mittelklasse: der 1.0-Dreizylinder wurde dort nicht angeboten
  passat: 1300, superb: 1300, insignia: 1300, mondeo: 1300,
  // Grossraum und Transporter
  sharan: 1300, alhambra: 1300, crafter: 1900, transit: 1900, master: 1900,
};

/**
 * Motorisierungen, die zu einem Modell und seiner Karosserieform passen.
 * Greift keine Einschraenkung, wird schrittweise gelockert, damit nie eine
 * leere Auswahl entsteht.
 */
export function enginesFor(
  style: EngineStyle,
  modelSlug: string,
  bodyType?: string,
): SeedEngine[] {
  const all = ENGINES[style];

  if (ELECTRIC_ONLY.has(modelSlug)) {
    const electric = all.filter((engine) => engine.fuel === 'ELECTRIC');
    if (electric.length > 0) return electric;
  }

  const byModel = all.filter(
    (engine) => !engine.models || engine.models.includes(modelSlug),
  );
  const base = byModel.length > 0 ? byModel : all.filter((engine) => !engine.models);

  // Es gilt die jeweils strengere der beiden Untergrenzen.
  const minimum = Math.max(
    (bodyType ? MIN_DISPLACEMENT[bodyType] : 0) ?? 0,
    MIN_DISPLACEMENT_MODEL[modelSlug] ?? 0,
  );
  const maximum = MAX_DISPLACEMENT_MODEL[modelSlug] ?? Infinity;
  if (minimum === 0 && maximum === Infinity) return base;

  const bySize = base.filter(
    (engine) =>
      // Elektroantriebe haben keinen Hubraum und bleiben unberuehrt.
      engine.displacementCcm === 0 ||
      (engine.displacementCcm >= minimum && engine.displacementCcm <= maximum),
  );

  return bySize.length > 0 ? bySize : base;
}
