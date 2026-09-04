import type { BodyType, VehicleCategory } from '@/lib/generated/prisma/enums';

export type SeedModel = {
  slug: string;
  name: string;
  bodyTypes: BodyType[];
  yearFrom?: number;
  category?: VehicleCategory;
  popular?: boolean;
};

/**
 * Motorengruppe der Marke, siehe engines.ts.
 *
 * Motorbezeichnungen sind Markenzeichen — TDI gehoert zu Volkswagen, dCi zu
 * Renault, CDTI zu Opel. Marken teilen sich eine Gruppe nur, wenn sie
 * tatsaechlich dieselben Motoren und Bezeichnungen fuehren.
 */
export type EngineStyle =
  | 'vw' | 'bmw' | 'mercedes' | 'renault' | 'psa' | 'fiat' | 'alfa'
  | 'toyota' | 'hyundai' | 'mazda' | 'honda' | 'mitsubishi' | 'ford'
  | 'opel' | 'volvo' | 'jlr' | 'porsche' | 'ev' | 'generic';

export type SeedBrand = {
  slug: string;
  name: string;
  popular: boolean;
  /**
   * Anteil am Bestand. Der Gebrauchtwagenmarkt im Kosovo und in Albanien
   * besteht ueberwiegend aus deutschen Importen, darum sind VW, Audi,
   * Mercedes und BMW deutlich staerker gewichtet als der Rest.
   */
  weight: number;
  engineStyle: EngineStyle;
  models: SeedModel[];
};

export const BRANDS: SeedBrand[] = [
  {
    slug: 'volkswagen', name: 'Volkswagen', popular: true, weight: 17, engineStyle: 'vw',
    models: [
      { slug: 'golf', name: 'Golf', bodyTypes: ['HATCHBACK', 'ESTATE'], yearFrom: 2003, popular: true },
      { slug: 'passat', name: 'Passat', bodyTypes: ['SEDAN', 'ESTATE'], yearFrom: 2005, popular: true },
      { slug: 'tiguan', name: 'Tiguan', bodyTypes: ['SUV'], yearFrom: 2008, popular: true },
      { slug: 'polo', name: 'Polo', bodyTypes: ['HATCHBACK'], yearFrom: 2005 },
      { slug: 'touran', name: 'Touran', bodyTypes: ['VAN'], yearFrom: 2005 },
      { slug: 'sharan', name: 'Sharan', bodyTypes: ['VAN'], yearFrom: 2004 },
      { slug: 'touareg', name: 'Touareg', bodyTypes: ['SUV'], yearFrom: 2004 },
      { slug: 'arteon', name: 'Arteon', bodyTypes: ['SEDAN', 'ESTATE'], yearFrom: 2017 },
      { slug: 'caddy', name: 'Caddy', bodyTypes: ['VAN'], yearFrom: 2005, category: 'VAN_TRUCK' },
      { slug: 'transporter', name: 'Transporter', bodyTypes: ['VAN', 'MINIBUS'], yearFrom: 2004, category: 'VAN_TRUCK' },
      { slug: 'crafter', name: 'Crafter', bodyTypes: ['VAN'], yearFrom: 2007, category: 'VAN_TRUCK' },
      { slug: 'id-4', name: 'ID.4', bodyTypes: ['SUV'], yearFrom: 2021 },
    ],
  },
  {
    slug: 'audi', name: 'Audi', popular: true, weight: 13, engineStyle: 'vw',
    models: [
      { slug: 'a3', name: 'A3', bodyTypes: ['HATCHBACK', 'SEDAN'], yearFrom: 2004, popular: true },
      { slug: 'a4', name: 'A4', bodyTypes: ['SEDAN', 'ESTATE'], yearFrom: 2005, popular: true },
      { slug: 'a6', name: 'A6', bodyTypes: ['SEDAN', 'ESTATE'], yearFrom: 2005, popular: true },
      { slug: 'a5', name: 'A5', bodyTypes: ['COUPE', 'SEDAN'], yearFrom: 2008 },
      { slug: 'a8', name: 'A8', bodyTypes: ['SEDAN'], yearFrom: 2004 },
      { slug: 'q5', name: 'Q5', bodyTypes: ['SUV'], yearFrom: 2009, popular: true },
      { slug: 'q7', name: 'Q7', bodyTypes: ['SUV'], yearFrom: 2006 },
      { slug: 'q3', name: 'Q3', bodyTypes: ['SUV'], yearFrom: 2012 },
      { slug: 'a1', name: 'A1', bodyTypes: ['HATCHBACK'], yearFrom: 2011 },
      { slug: 'e-tron', name: 'e-tron', bodyTypes: ['SUV'], yearFrom: 2019 },
    ],
  },
  {
    slug: 'mercedes-benz', name: 'Mercedes-Benz', popular: true, weight: 13, engineStyle: 'mercedes',
    models: [
      { slug: 'c-klasse', name: 'C-Klasse', bodyTypes: ['SEDAN', 'ESTATE', 'COUPE'], yearFrom: 2005, popular: true },
      { slug: 'e-klasse', name: 'E-Klasse', bodyTypes: ['SEDAN', 'ESTATE', 'COUPE'], yearFrom: 2005, popular: true },
      { slug: 'a-klasse', name: 'A-Klasse', bodyTypes: ['HATCHBACK', 'SEDAN'], yearFrom: 2006 },
      { slug: 'b-klasse', name: 'B-Klasse', bodyTypes: ['VAN'], yearFrom: 2006 },
      { slug: 's-klasse', name: 'S-Klasse', bodyTypes: ['SEDAN'], yearFrom: 2006 },
      { slug: 'gle', name: 'GLE', bodyTypes: ['SUV'], yearFrom: 2015 },
      { slug: 'glc', name: 'GLC', bodyTypes: ['SUV'], yearFrom: 2016 },
      { slug: 'gla', name: 'GLA', bodyTypes: ['SUV'], yearFrom: 2014 },
      { slug: 'ml', name: 'ML', bodyTypes: ['SUV'], yearFrom: 2005 },
      { slug: 'vito', name: 'Vito', bodyTypes: ['VAN', 'MINIBUS'], yearFrom: 2004, category: 'VAN_TRUCK' },
      { slug: 'sprinter', name: 'Sprinter', bodyTypes: ['VAN'], yearFrom: 2006, category: 'VAN_TRUCK' },
    ],
  },
  {
    slug: 'bmw', name: 'BMW', popular: true, weight: 12, engineStyle: 'bmw',
    models: [
      { slug: '3er', name: '3er', bodyTypes: ['SEDAN', 'ESTATE'], yearFrom: 2005, popular: true },
      { slug: '5er', name: '5er', bodyTypes: ['SEDAN', 'ESTATE'], yearFrom: 2005, popular: true },
      { slug: '1er', name: '1er', bodyTypes: ['HATCHBACK'], yearFrom: 2005 },
      { slug: '7er', name: '7er', bodyTypes: ['SEDAN'], yearFrom: 2005 },
      { slug: 'x1', name: 'X1', bodyTypes: ['SUV'], yearFrom: 2010 },
      { slug: 'x3', name: 'X3', bodyTypes: ['SUV'], yearFrom: 2006, popular: true },
      { slug: 'x5', name: 'X5', bodyTypes: ['SUV'], yearFrom: 2005, popular: true },
      { slug: 'x6', name: 'X6', bodyTypes: ['SUV', 'COUPE'], yearFrom: 2009 },
      { slug: '4er', name: '4er', bodyTypes: ['COUPE', 'CONVERTIBLE'], yearFrom: 2014 },
      { slug: 'i3', name: 'i3', bodyTypes: ['HATCHBACK'], yearFrom: 2014 },
    ],
  },
  {
    slug: 'skoda', name: 'Škoda', popular: true, weight: 8, engineStyle: 'vw',
    models: [
      { slug: 'octavia', name: 'Octavia', bodyTypes: ['HATCHBACK', 'ESTATE'], yearFrom: 2005, popular: true },
      { slug: 'superb', name: 'Superb', bodyTypes: ['SEDAN', 'ESTATE'], yearFrom: 2008, popular: true },
      { slug: 'fabia', name: 'Fabia', bodyTypes: ['HATCHBACK', 'ESTATE'], yearFrom: 2005 },
      { slug: 'kodiaq', name: 'Kodiaq', bodyTypes: ['SUV'], yearFrom: 2017 },
      { slug: 'karoq', name: 'Karoq', bodyTypes: ['SUV'], yearFrom: 2018 },
      { slug: 'yeti', name: 'Yeti', bodyTypes: ['SUV'], yearFrom: 2010 },
      { slug: 'rapid', name: 'Rapid', bodyTypes: ['HATCHBACK'], yearFrom: 2013 },
    ],
  },
  {
    slug: 'opel', name: 'Opel', popular: true, weight: 6, engineStyle: 'opel',
    models: [
      { slug: 'astra', name: 'Astra', bodyTypes: ['HATCHBACK', 'ESTATE'], yearFrom: 2005, popular: true },
      { slug: 'corsa', name: 'Corsa', bodyTypes: ['HATCHBACK'], yearFrom: 2005 },
      { slug: 'insignia', name: 'Insignia', bodyTypes: ['SEDAN', 'ESTATE'], yearFrom: 2009 },
      { slug: 'zafira', name: 'Zafira', bodyTypes: ['VAN'], yearFrom: 2005 },
      { slug: 'mokka', name: 'Mokka', bodyTypes: ['SUV'], yearFrom: 2013 },
      { slug: 'vivaro', name: 'Vivaro', bodyTypes: ['VAN'], yearFrom: 2006, category: 'VAN_TRUCK' },
    ],
  },
  {
    slug: 'ford', name: 'Ford', popular: true, weight: 6, engineStyle: 'ford',
    models: [
      { slug: 'focus', name: 'Focus', bodyTypes: ['HATCHBACK', 'ESTATE'], yearFrom: 2005, popular: true },
      { slug: 'fiesta', name: 'Fiesta', bodyTypes: ['HATCHBACK'], yearFrom: 2005 },
      { slug: 'mondeo', name: 'Mondeo', bodyTypes: ['SEDAN', 'ESTATE'], yearFrom: 2005 },
      { slug: 'kuga', name: 'Kuga', bodyTypes: ['SUV'], yearFrom: 2010 },
      { slug: 'c-max', name: 'C-Max', bodyTypes: ['VAN'], yearFrom: 2005 },
      { slug: 'transit', name: 'Transit', bodyTypes: ['VAN'], yearFrom: 2006, category: 'VAN_TRUCK' },
      { slug: 'ranger', name: 'Ranger', bodyTypes: ['PICKUP'], yearFrom: 2012, category: 'VAN_TRUCK' },
    ],
  },
  {
    slug: 'renault', name: 'Renault', popular: true, weight: 5, engineStyle: 'renault',
    models: [
      { slug: 'clio', name: 'Clio', bodyTypes: ['HATCHBACK'], yearFrom: 2005, popular: true },
      { slug: 'megane', name: 'Mégane', bodyTypes: ['HATCHBACK', 'ESTATE'], yearFrom: 2005 },
      { slug: 'captur', name: 'Captur', bodyTypes: ['SUV'], yearFrom: 2014 },
      { slug: 'kadjar', name: 'Kadjar', bodyTypes: ['SUV'], yearFrom: 2016 },
      { slug: 'scenic', name: 'Scénic', bodyTypes: ['VAN'], yearFrom: 2005 },
      { slug: 'trafic', name: 'Trafic', bodyTypes: ['VAN'], yearFrom: 2006, category: 'VAN_TRUCK' },
      { slug: 'master', name: 'Master', bodyTypes: ['VAN'], yearFrom: 2006, category: 'VAN_TRUCK' },
    ],
  },
  {
    slug: 'peugeot', name: 'Peugeot', popular: true, weight: 4, engineStyle: 'psa',
    models: [
      { slug: '208', name: '208', bodyTypes: ['HATCHBACK'], yearFrom: 2013 },
      { slug: '308', name: '308', bodyTypes: ['HATCHBACK', 'ESTATE'], yearFrom: 2008, popular: true },
      { slug: '3008', name: '3008', bodyTypes: ['SUV'], yearFrom: 2010 },
      { slug: '5008', name: '5008', bodyTypes: ['SUV', 'VAN'], yearFrom: 2010 },
      { slug: '206', name: '206', bodyTypes: ['HATCHBACK'], yearFrom: 2003 },
      { slug: 'partner', name: 'Partner', bodyTypes: ['VAN'], yearFrom: 2008, category: 'VAN_TRUCK' },
      { slug: 'boxer', name: 'Boxer', bodyTypes: ['VAN'], yearFrom: 2007, category: 'VAN_TRUCK' },
    ],
  },
  {
    slug: 'toyota', name: 'Toyota', popular: true, weight: 4, engineStyle: 'toyota',
    models: [
      { slug: 'corolla', name: 'Corolla', bodyTypes: ['SEDAN', 'HATCHBACK', 'ESTATE'], yearFrom: 2005, popular: true },
      { slug: 'yaris', name: 'Yaris', bodyTypes: ['HATCHBACK'], yearFrom: 2005 },
      { slug: 'rav4', name: 'RAV4', bodyTypes: ['SUV'], yearFrom: 2006, popular: true },
      { slug: 'avensis', name: 'Avensis', bodyTypes: ['SEDAN', 'ESTATE'], yearFrom: 2005 },
      { slug: 'c-hr', name: 'C-HR', bodyTypes: ['SUV'], yearFrom: 2017 },
      { slug: 'land-cruiser', name: 'Land Cruiser', bodyTypes: ['SUV'], yearFrom: 2005 },
      { slug: 'hilux', name: 'Hilux', bodyTypes: ['PICKUP'], yearFrom: 2006, category: 'VAN_TRUCK' },
    ],
  },
  {
    slug: 'seat', name: 'SEAT', popular: false, weight: 3, engineStyle: 'vw',
    models: [
      { slug: 'leon', name: 'Leon', bodyTypes: ['HATCHBACK', 'ESTATE'], yearFrom: 2006 },
      { slug: 'ibiza', name: 'Ibiza', bodyTypes: ['HATCHBACK'], yearFrom: 2005 },
      { slug: 'ateca', name: 'Ateca', bodyTypes: ['SUV'], yearFrom: 2017 },
      { slug: 'arona', name: 'Arona', bodyTypes: ['SUV'], yearFrom: 2018 },
      { slug: 'alhambra', name: 'Alhambra', bodyTypes: ['VAN'], yearFrom: 2011 },
    ],
  },
  {
    slug: 'citroen', name: 'Citroën', popular: false, weight: 3, engineStyle: 'psa',
    models: [
      { slug: 'c3', name: 'C3', bodyTypes: ['HATCHBACK'], yearFrom: 2006 },
      { slug: 'c4', name: 'C4', bodyTypes: ['HATCHBACK'], yearFrom: 2006 },
      { slug: 'c5', name: 'C5', bodyTypes: ['SEDAN', 'ESTATE'], yearFrom: 2005 },
      { slug: 'berlingo', name: 'Berlingo', bodyTypes: ['VAN'], yearFrom: 2008, category: 'VAN_TRUCK' },
      { slug: 'jumper', name: 'Jumper', bodyTypes: ['VAN'], yearFrom: 2007, category: 'VAN_TRUCK' },
    ],
  },
  {
    slug: 'fiat', name: 'Fiat', popular: false, weight: 3, engineStyle: 'fiat',
    models: [
      { slug: 'punto', name: 'Punto', bodyTypes: ['HATCHBACK'], yearFrom: 2005 },
      { slug: '500', name: '500', bodyTypes: ['HATCHBACK'], yearFrom: 2008 },
      { slug: 'panda', name: 'Panda', bodyTypes: ['HATCHBACK'], yearFrom: 2005 },
      { slug: 'tipo', name: 'Tipo', bodyTypes: ['HATCHBACK', 'SEDAN'], yearFrom: 2016 },
      { slug: 'doblo', name: 'Doblò', bodyTypes: ['VAN'], yearFrom: 2006, category: 'VAN_TRUCK' },
      { slug: 'ducato', name: 'Ducato', bodyTypes: ['VAN'], yearFrom: 2007, category: 'VAN_TRUCK' },
    ],
  },
  {
    slug: 'hyundai', name: 'Hyundai', popular: false, weight: 3, engineStyle: 'hyundai',
    models: [
      { slug: 'i30', name: 'i30', bodyTypes: ['HATCHBACK', 'ESTATE'], yearFrom: 2008 },
      { slug: 'i20', name: 'i20', bodyTypes: ['HATCHBACK'], yearFrom: 2010 },
      { slug: 'tucson', name: 'Tucson', bodyTypes: ['SUV'], yearFrom: 2006, popular: true },
      { slug: 'santa-fe', name: 'Santa Fe', bodyTypes: ['SUV'], yearFrom: 2006 },
      { slug: 'kona', name: 'Kona', bodyTypes: ['SUV'], yearFrom: 2018 },
    ],
  },
  {
    slug: 'kia', name: 'Kia', popular: false, weight: 3, engineStyle: 'hyundai',
    models: [
      { slug: 'ceed', name: 'Ceed', bodyTypes: ['HATCHBACK', 'ESTATE'], yearFrom: 2008 },
      { slug: 'sportage', name: 'Sportage', bodyTypes: ['SUV'], yearFrom: 2006, popular: true },
      { slug: 'rio', name: 'Rio', bodyTypes: ['HATCHBACK'], yearFrom: 2006 },
      { slug: 'sorento', name: 'Sorento', bodyTypes: ['SUV'], yearFrom: 2006 },
      { slug: 'niro', name: 'Niro', bodyTypes: ['SUV'], yearFrom: 2018 },
    ],
  },
  {
    slug: 'nissan', name: 'Nissan', popular: false, weight: 2, engineStyle: 'renault',
    models: [
      { slug: 'qashqai', name: 'Qashqai', bodyTypes: ['SUV'], yearFrom: 2008, popular: true },
      { slug: 'juke', name: 'Juke', bodyTypes: ['SUV'], yearFrom: 2011 },
      { slug: 'x-trail', name: 'X-Trail', bodyTypes: ['SUV'], yearFrom: 2006 },
      { slug: 'micra', name: 'Micra', bodyTypes: ['HATCHBACK'], yearFrom: 2005 },
      { slug: 'navara', name: 'Navara', bodyTypes: ['PICKUP'], yearFrom: 2008, category: 'VAN_TRUCK' },
    ],
  },
  {
    slug: 'volvo', name: 'Volvo', popular: false, weight: 2, engineStyle: 'volvo',
    models: [
      { slug: 'v40', name: 'V40', bodyTypes: ['HATCHBACK'], yearFrom: 2013 },
      { slug: 'v60', name: 'V60', bodyTypes: ['ESTATE'], yearFrom: 2011 },
      { slug: 'v70', name: 'V70', bodyTypes: ['ESTATE'], yearFrom: 2005 },
      { slug: 'xc60', name: 'XC60', bodyTypes: ['SUV'], yearFrom: 2010 },
      { slug: 'xc90', name: 'XC90', bodyTypes: ['SUV'], yearFrom: 2005 },
      { slug: 's60', name: 'S60', bodyTypes: ['SEDAN'], yearFrom: 2006 },
    ],
  },
  {
    slug: 'mazda', name: 'Mazda', popular: false, weight: 2, engineStyle: 'mazda',
    models: [
      { slug: 'mazda3', name: 'Mazda3', bodyTypes: ['HATCHBACK', 'SEDAN'], yearFrom: 2006 },
      { slug: 'mazda6', name: 'Mazda6', bodyTypes: ['SEDAN', 'ESTATE'], yearFrom: 2005 },
      { slug: 'cx-5', name: 'CX-5', bodyTypes: ['SUV'], yearFrom: 2013 },
      { slug: 'cx-3', name: 'CX-3', bodyTypes: ['SUV'], yearFrom: 2016 },
    ],
  },
  {
    slug: 'honda', name: 'Honda', popular: false, weight: 2, engineStyle: 'honda',
    models: [
      { slug: 'civic', name: 'Civic', bodyTypes: ['HATCHBACK', 'SEDAN'], yearFrom: 2006 },
      { slug: 'cr-v', name: 'CR-V', bodyTypes: ['SUV'], yearFrom: 2006 },
      { slug: 'accord', name: 'Accord', bodyTypes: ['SEDAN', 'ESTATE'], yearFrom: 2005 },
      { slug: 'jazz', name: 'Jazz', bodyTypes: ['HATCHBACK'], yearFrom: 2006 },
    ],
  },
  {
    slug: 'dacia', name: 'Dacia', popular: false, weight: 2, engineStyle: 'renault',
    models: [
      { slug: 'duster', name: 'Duster', bodyTypes: ['SUV'], yearFrom: 2011, popular: true },
      { slug: 'sandero', name: 'Sandero', bodyTypes: ['HATCHBACK'], yearFrom: 2009 },
      { slug: 'logan', name: 'Logan', bodyTypes: ['SEDAN', 'ESTATE'], yearFrom: 2006 },
      { slug: 'dokker', name: 'Dokker', bodyTypes: ['VAN'], yearFrom: 2013, category: 'VAN_TRUCK' },
    ],
  },
  {
    slug: 'mitsubishi', name: 'Mitsubishi', popular: false, weight: 1, engineStyle: 'mitsubishi',
    models: [
      { slug: 'outlander', name: 'Outlander', bodyTypes: ['SUV'], yearFrom: 2007 },
      { slug: 'asx', name: 'ASX', bodyTypes: ['SUV'], yearFrom: 2011 },
      { slug: 'pajero', name: 'Pajero', bodyTypes: ['SUV'], yearFrom: 2005 },
      { slug: 'l200', name: 'L200', bodyTypes: ['PICKUP'], yearFrom: 2007, category: 'VAN_TRUCK' },
    ],
  },
  {
    slug: 'suzuki', name: 'Suzuki', popular: false, weight: 1, engineStyle: 'mitsubishi',
    models: [
      { slug: 'vitara', name: 'Vitara', bodyTypes: ['SUV'], yearFrom: 2006 },
      { slug: 'swift', name: 'Swift', bodyTypes: ['HATCHBACK'], yearFrom: 2006 },
      { slug: 'jimny', name: 'Jimny', bodyTypes: ['SUV'], yearFrom: 2005 },
      { slug: 's-cross', name: 'S-Cross', bodyTypes: ['SUV'], yearFrom: 2014 },
    ],
  },
  {
    slug: 'jeep', name: 'Jeep', popular: false, weight: 1, engineStyle: 'generic',
    models: [
      { slug: 'grand-cherokee', name: 'Grand Cherokee', bodyTypes: ['SUV'], yearFrom: 2006 },
      { slug: 'compass', name: 'Compass', bodyTypes: ['SUV'], yearFrom: 2012 },
      { slug: 'renegade', name: 'Renegade', bodyTypes: ['SUV'], yearFrom: 2015 },
      { slug: 'wrangler', name: 'Wrangler', bodyTypes: ['SUV'], yearFrom: 2007 },
    ],
  },
  {
    slug: 'land-rover', name: 'Land Rover', popular: false, weight: 1, engineStyle: 'jlr',
    models: [
      { slug: 'range-rover-sport', name: 'Range Rover Sport', bodyTypes: ['SUV'], yearFrom: 2006 },
      { slug: 'range-rover-evoque', name: 'Range Rover Evoque', bodyTypes: ['SUV'], yearFrom: 2012 },
      { slug: 'discovery', name: 'Discovery', bodyTypes: ['SUV'], yearFrom: 2005 },
      { slug: 'defender', name: 'Defender', bodyTypes: ['SUV'], yearFrom: 2020 },
    ],
  },
  {
    slug: 'porsche', name: 'Porsche', popular: false, weight: 1, engineStyle: 'porsche',
    models: [
      { slug: 'cayenne', name: 'Cayenne', bodyTypes: ['SUV'], yearFrom: 2006 },
      { slug: 'macan', name: 'Macan', bodyTypes: ['SUV'], yearFrom: 2015 },
      { slug: 'panamera', name: 'Panamera', bodyTypes: ['SEDAN'], yearFrom: 2010 },
      { slug: '911', name: '911', bodyTypes: ['COUPE', 'CONVERTIBLE'], yearFrom: 2005 },
    ],
  },
  {
    slug: 'mini', name: 'MINI', popular: false, weight: 1, engineStyle: 'bmw',
    models: [
      { slug: 'cooper', name: 'Cooper', bodyTypes: ['HATCHBACK'], yearFrom: 2006 },
      { slug: 'countryman', name: 'Countryman', bodyTypes: ['SUV'], yearFrom: 2011 },
      { slug: 'clubman', name: 'Clubman', bodyTypes: ['ESTATE'], yearFrom: 2008 },
    ],
  },
  {
    slug: 'alfa-romeo', name: 'Alfa Romeo', popular: false, weight: 1, engineStyle: 'alfa',
    models: [
      { slug: 'giulietta', name: 'Giulietta', bodyTypes: ['HATCHBACK'], yearFrom: 2011 },
      { slug: 'giulia', name: 'Giulia', bodyTypes: ['SEDAN'], yearFrom: 2016 },
      { slug: 'stelvio', name: 'Stelvio', bodyTypes: ['SUV'], yearFrom: 2017 },
      { slug: '159', name: '159', bodyTypes: ['SEDAN', 'ESTATE'], yearFrom: 2006 },
    ],
  },
  {
    slug: 'chevrolet', name: 'Chevrolet', popular: false, weight: 1, engineStyle: 'opel',
    models: [
      { slug: 'cruze', name: 'Cruze', bodyTypes: ['SEDAN', 'HATCHBACK'], yearFrom: 2010 },
      { slug: 'aveo', name: 'Aveo', bodyTypes: ['HATCHBACK'], yearFrom: 2006 },
      { slug: 'captiva', name: 'Captiva', bodyTypes: ['SUV'], yearFrom: 2007 },
    ],
  },
  {
    slug: 'tesla', name: 'Tesla', popular: false, weight: 1, engineStyle: 'ev',
    models: [
      { slug: 'model-3', name: 'Model 3', bodyTypes: ['SEDAN'], yearFrom: 2019 },
      { slug: 'model-y', name: 'Model Y', bodyTypes: ['SUV'], yearFrom: 2021 },
      { slug: 'model-s', name: 'Model S', bodyTypes: ['SEDAN'], yearFrom: 2014 },
    ],
  },
  {
    slug: 'smart', name: 'smart', popular: false, weight: 1, engineStyle: 'mercedes',
    models: [
      { slug: 'fortwo', name: 'fortwo', bodyTypes: ['COUPE', 'CONVERTIBLE'], yearFrom: 2005 },
      { slug: 'forfour', name: 'forfour', bodyTypes: ['HATCHBACK'], yearFrom: 2015 },
    ],
  },
  {
    slug: 'subaru', name: 'Subaru', popular: false, weight: 1, engineStyle: 'generic',
    models: [
      { slug: 'forester', name: 'Forester', bodyTypes: ['SUV'], yearFrom: 2006 },
      { slug: 'outback', name: 'Outback', bodyTypes: ['ESTATE'], yearFrom: 2006 },
      { slug: 'impreza', name: 'Impreza', bodyTypes: ['HATCHBACK', 'SEDAN'], yearFrom: 2006 },
    ],
  },
  {
    slug: 'lexus', name: 'Lexus', popular: false, weight: 1, engineStyle: 'toyota',
    models: [
      { slug: 'nx', name: 'NX', bodyTypes: ['SUV'], yearFrom: 2015 },
      { slug: 'rx', name: 'RX', bodyTypes: ['SUV'], yearFrom: 2006 },
      { slug: 'is', name: 'IS', bodyTypes: ['SEDAN'], yearFrom: 2006 },
    ],
  },
  {
    slug: 'jaguar', name: 'Jaguar', popular: false, weight: 1, engineStyle: 'jlr',
    models: [
      { slug: 'xf', name: 'XF', bodyTypes: ['SEDAN', 'ESTATE'], yearFrom: 2009 },
      { slug: 'f-pace', name: 'F-Pace', bodyTypes: ['SUV'], yearFrom: 2017 },
      { slug: 'xe', name: 'XE', bodyTypes: ['SEDAN'], yearFrom: 2016 },
    ],
  },
  {
    slug: 'iveco', name: 'Iveco', popular: false, weight: 1, engineStyle: 'fiat',
    models: [
      { slug: 'daily', name: 'Daily', bodyTypes: ['VAN', 'MINIBUS'], yearFrom: 2006, category: 'VAN_TRUCK' },
      { slug: 'eurocargo', name: 'Eurocargo', bodyTypes: ['TRUCK'], yearFrom: 2008, category: 'VAN_TRUCK' },
    ],
  },
  {
    slug: 'man', name: 'MAN', popular: false, weight: 1, engineStyle: 'generic',
    models: [
      { slug: 'tge', name: 'TGE', bodyTypes: ['VAN'], yearFrom: 2018, category: 'VAN_TRUCK' },
      { slug: 'tgl', name: 'TGL', bodyTypes: ['TRUCK'], yearFrom: 2008, category: 'VAN_TRUCK' },
    ],
  },
];

export const TOTAL_MODELS = BRANDS.reduce((sum, b) => sum + b.models.length, 0);
export const TOTAL_WEIGHT = BRANDS.reduce((sum, b) => sum + b.weight, 0);
