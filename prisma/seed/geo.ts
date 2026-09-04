/**
 * Laender und Staedte des Zielmarkts mit echten Koordinaten. Sie tragen die
 * Umkreissuche: Bounding-Box zum Vorfiltern, danach Haversine fuer die exakte
 * Entfernung. Eine PostGIS-Erweiterung wird dadurch nicht gebraucht.
 */

export type SeedCity = {
  slug: string;
  name: string;
  region?: string;
  postalCode?: string;
  lat: number;
  lng: number;
  population?: number;
};

export type SeedCountry = {
  code: string;
  nameSq: string;
  nameDe: string;
  nameEn: string;
  phonePrefix: string;
  currency: string;
  isCoreMarket: boolean;
  isImportOrigin: boolean;
  sortOrder: number;
  cities: SeedCity[];
};

export const COUNTRIES: SeedCountry[] = [
  {
    code: 'XK',
    nameSq: 'Kosovë',
    nameDe: 'Kosovo',
    nameEn: 'Kosovo',
    phonePrefix: '+383',
    currency: 'EUR',
    isCoreMarket: true,
    isImportOrigin: false,
    sortOrder: 1,
    cities: [
      { slug: 'prishtine', name: 'Prishtinë', region: 'Prishtinë', postalCode: '10000', lat: 42.6629, lng: 21.1655, population: 198897 },
      { slug: 'prizren', name: 'Prizren', region: 'Prizren', postalCode: '20000', lat: 42.2139, lng: 20.7397, population: 177781 },
      { slug: 'peje', name: 'Pejë', region: 'Pejë', postalCode: '30000', lat: 42.6593, lng: 20.2887, population: 96450 },
      { slug: 'gjakove', name: 'Gjakovë', region: 'Gjakovë', postalCode: '50000', lat: 42.3803, lng: 20.4308, population: 94556 },
      { slug: 'ferizaj', name: 'Ferizaj', region: 'Ferizaj', postalCode: '70000', lat: 42.3706, lng: 21.1553, population: 108610 },
      { slug: 'gjilan', name: 'Gjilan', region: 'Gjilan', postalCode: '60000', lat: 42.4637, lng: 21.4694, population: 90178 },
      { slug: 'mitrovice', name: 'Mitrovicë', region: 'Mitrovicë', postalCode: '40000', lat: 42.8914, lng: 20.866, population: 71909 },
      { slug: 'podujeve', name: 'Podujevë', region: 'Prishtinë', postalCode: '11000', lat: 42.9111, lng: 21.1933, population: 88499 },
      { slug: 'vushtrri', name: 'Vushtrri', region: 'Mitrovicë', postalCode: '42000', lat: 42.8231, lng: 20.9675, population: 69870 },
      { slug: 'suhareke', name: 'Suharekë', region: 'Prizren', postalCode: '23000', lat: 42.3586, lng: 20.8253, population: 59722 },
      { slug: 'rahovec', name: 'Rahovec', region: 'Gjakovë', postalCode: '21000', lat: 42.3994, lng: 20.6547, population: 56208 },
      { slug: 'lipjan', name: 'Lipjan', region: 'Prishtinë', postalCode: '14000', lat: 42.5236, lng: 21.1258, population: 57605 },
      { slug: 'drenas', name: 'Drenas', region: 'Prishtinë', postalCode: '13000', lat: 42.6236, lng: 20.8956, population: 58531 },
      { slug: 'fushe-kosove', name: 'Fushë Kosovë', region: 'Prishtinë', postalCode: '12000', lat: 42.6367, lng: 21.0906, population: 34827 },
      { slug: 'malisheve', name: 'Malishevë', region: 'Prizren', postalCode: '24000', lat: 42.4822, lng: 20.7458, population: 54613 },
    ],
  },
  {
    code: 'AL',
    nameSq: 'Shqipëri',
    nameDe: 'Albanien',
    nameEn: 'Albania',
    phonePrefix: '+355',
    currency: 'ALL',
    isCoreMarket: true,
    isImportOrigin: false,
    sortOrder: 2,
    cities: [
      { slug: 'tirane', name: 'Tiranë', region: 'Tiranë', postalCode: '1001', lat: 41.3275, lng: 19.8187, population: 557422 },
      { slug: 'durres', name: 'Durrës', region: 'Durrës', postalCode: '2001', lat: 41.3231, lng: 19.4414, population: 175110 },
      { slug: 'vlore', name: 'Vlorë', region: 'Vlorë', postalCode: '9401', lat: 40.4661, lng: 19.4914, population: 104827 },
      { slug: 'shkoder', name: 'Shkodër', region: 'Shkodër', postalCode: '4001', lat: 42.0693, lng: 19.5033, population: 135612 },
      { slug: 'elbasan', name: 'Elbasan', region: 'Elbasan', postalCode: '3001', lat: 41.1125, lng: 20.0822, population: 141714 },
      { slug: 'fier', name: 'Fier', region: 'Fier', postalCode: '9301', lat: 40.7239, lng: 19.5561, population: 120655 },
      { slug: 'korce', name: 'Korçë', region: 'Korçë', postalCode: '7001', lat: 40.6186, lng: 20.7808, population: 75994 },
      { slug: 'berat', name: 'Berat', region: 'Berat', postalCode: '5001', lat: 40.7058, lng: 19.9522, population: 60031 },
      { slug: 'lushnje', name: 'Lushnjë', region: 'Fier', postalCode: '9001', lat: 40.9419, lng: 19.705, population: 83903 },
      { slug: 'kukes', name: 'Kukës', region: 'Kukës', postalCode: '8501', lat: 42.0769, lng: 20.4219, population: 16719 },
      { slug: 'sarande', name: 'Sarandë', region: 'Vlorë', postalCode: '9701', lat: 39.8756, lng: 20.0053, population: 41173 },
    ],
  },
  {
    code: 'MK',
    nameSq: 'Maqedoni e Veriut',
    nameDe: 'Nordmazedonien',
    nameEn: 'North Macedonia',
    phonePrefix: '+389',
    currency: 'MKD',
    isCoreMarket: true,
    isImportOrigin: false,
    sortOrder: 3,
    cities: [
      { slug: 'shkup', name: 'Shkup', region: 'Shkup', postalCode: '1000', lat: 41.9973, lng: 21.428, population: 526502 },
      { slug: 'tetove', name: 'Tetovë', region: 'Pollog', postalCode: '1200', lat: 42.0106, lng: 20.9714, population: 84770 },
      { slug: 'gostivar', name: 'Gostivar', region: 'Pollog', postalCode: '1230', lat: 41.7967, lng: 20.9086, population: 59770 },
      { slug: 'struge', name: 'Strugë', region: 'Jugperëndim', postalCode: '6330', lat: 41.1775, lng: 20.6781, population: 63376 },
      { slug: 'kumanove', name: 'Kumanovë', region: 'Verilindje', postalCode: '1300', lat: 42.1322, lng: 21.7144, population: 105484 },
      { slug: 'diber', name: 'Dibër', region: 'Jugperëndim', postalCode: '1250', lat: 41.5192, lng: 20.5272, population: 19542 },
    ],
  },
  {
    code: 'ME',
    nameSq: 'Mal i Zi',
    nameDe: 'Montenegro',
    nameEn: 'Montenegro',
    phonePrefix: '+382',
    currency: 'EUR',
    isCoreMarket: false,
    isImportOrigin: false,
    sortOrder: 4,
    cities: [
      { slug: 'podgorice', name: 'Podgoricë', postalCode: '81000', lat: 42.4304, lng: 19.2594, population: 150977 },
      { slug: 'ulqin', name: 'Ulqin', postalCode: '85360', lat: 41.9294, lng: 19.205, population: 19921 },
      { slug: 'tuz', name: 'Tuz', postalCode: '81206', lat: 42.3672, lng: 19.3311, population: 11488 },
    ],
  },
  {
    code: 'RS',
    nameSq: 'Serbi',
    nameDe: 'Serbien',
    nameEn: 'Serbia',
    phonePrefix: '+381',
    currency: 'RSD',
    isCoreMarket: false,
    isImportOrigin: false,
    sortOrder: 5,
    cities: [
      { slug: 'beograd', name: 'Beograd', postalCode: '11000', lat: 44.7866, lng: 20.4489, population: 1197714 },
      { slug: 'presheve', name: 'Preshevë', postalCode: '17523', lat: 42.3086, lng: 21.6494, population: 34904 },
      { slug: 'novi-pazar', name: 'Novi Pazar', postalCode: '36300', lat: 43.1367, lng: 20.5122, population: 100410 },
    ],
  },
  {
    code: 'BA',
    nameSq: 'Bosnjë dhe Hercegovinë',
    nameDe: 'Bosnien und Herzegowina',
    nameEn: 'Bosnia and Herzegovina',
    phonePrefix: '+387',
    currency: 'BAM',
    isCoreMarket: false,
    isImportOrigin: false,
    sortOrder: 6,
    cities: [
      { slug: 'sarajeve', name: 'Sarajevë', postalCode: '71000', lat: 43.8563, lng: 18.4131, population: 275524 },
      { slug: 'banja-luka', name: 'Banja Luka', postalCode: '78000', lat: 44.7722, lng: 17.191, population: 185042 },
    ],
  },
  {
    code: 'HR',
    nameSq: 'Kroaci',
    nameDe: 'Kroatien',
    nameEn: 'Croatia',
    phonePrefix: '+385',
    currency: 'EUR',
    isCoreMarket: false,
    isImportOrigin: true,
    sortOrder: 7,
    cities: [
      { slug: 'zagreb', name: 'Zagreb', postalCode: '10000', lat: 45.815, lng: 15.9819, population: 767131 },
      { slug: 'split', name: 'Split', postalCode: '21000', lat: 43.5081, lng: 16.4402, population: 149830 },
    ],
  },
  {
    code: 'SI',
    nameSq: 'Slloveni',
    nameDe: 'Slowenien',
    nameEn: 'Slovenia',
    phonePrefix: '+386',
    currency: 'EUR',
    isCoreMarket: false,
    isImportOrigin: true,
    sortOrder: 8,
    cities: [
      { slug: 'ljubljane', name: 'Ljubljanë', postalCode: '1000', lat: 46.0569, lng: 14.5058, population: 295504 },
    ],
  },
  {
    code: 'DE',
    nameSq: 'Gjermani',
    nameDe: 'Deutschland',
    nameEn: 'Germany',
    phonePrefix: '+49',
    currency: 'EUR',
    isCoreMarket: false,
    isImportOrigin: true,
    sortOrder: 10,
    cities: [
      { slug: 'stuttgart', name: 'Stuttgart', postalCode: '70173', lat: 48.7758, lng: 9.1829, population: 626275 },
      { slug: 'muenchen', name: 'München', postalCode: '80331', lat: 48.1351, lng: 11.582, population: 1488202 },
      { slug: 'duesseldorf', name: 'Düsseldorf', postalCode: '40213', lat: 51.2277, lng: 6.7735, population: 619294 },
      { slug: 'hamburg', name: 'Hamburg', postalCode: '20095', lat: 53.5511, lng: 9.9937, population: 1841179 },
      { slug: 'frankfurt', name: 'Frankfurt am Main', postalCode: '60311', lat: 50.1109, lng: 8.6821, population: 764104 },
    ],
  },
  {
    code: 'CH',
    nameSq: 'Zvicër',
    nameDe: 'Schweiz',
    nameEn: 'Switzerland',
    phonePrefix: '+41',
    currency: 'CHF',
    isCoreMarket: false,
    isImportOrigin: true,
    sortOrder: 11,
    cities: [
      { slug: 'zuerich', name: 'Zürich', postalCode: '8001', lat: 47.3769, lng: 8.5417, population: 421878 },
      { slug: 'geneve', name: 'Genève', postalCode: '1201', lat: 46.2044, lng: 6.1432, population: 203856 },
    ],
  },
  {
    code: 'AT',
    nameSq: 'Austri',
    nameDe: 'Österreich',
    nameEn: 'Austria',
    phonePrefix: '+43',
    currency: 'EUR',
    isCoreMarket: false,
    isImportOrigin: true,
    sortOrder: 12,
    cities: [
      { slug: 'wien', name: 'Wien', postalCode: '1010', lat: 48.2082, lng: 16.3738, population: 1911191 },
      { slug: 'graz', name: 'Graz', postalCode: '8010', lat: 47.0707, lng: 15.4395, population: 289440 },
    ],
  },
  {
    code: 'IT',
    nameSq: 'Itali',
    nameDe: 'Italien',
    nameEn: 'Italy',
    phonePrefix: '+39',
    currency: 'EUR',
    isCoreMarket: false,
    isImportOrigin: true,
    sortOrder: 13,
    cities: [
      { slug: 'milano', name: 'Milano', postalCode: '20121', lat: 45.4642, lng: 9.19, population: 1371498 },
      { slug: 'bari', name: 'Bari', postalCode: '70121', lat: 41.1171, lng: 16.8719, population: 315284 },
    ],
  },
  {
    code: 'BE',
    nameSq: 'Belgjikë',
    nameDe: 'Belgien',
    nameEn: 'Belgium',
    phonePrefix: '+32',
    currency: 'EUR',
    isCoreMarket: false,
    isImportOrigin: true,
    sortOrder: 14,
    cities: [
      { slug: 'bruxelles', name: 'Bruxelles', postalCode: '1000', lat: 50.8476, lng: 4.3572, population: 185103 },
      { slug: 'antwerpen', name: 'Antwerpen', postalCode: '2000', lat: 51.2194, lng: 4.4025, population: 529247 },
    ],
  },
];

export const TOTAL_CITIES = COUNTRIES.reduce((sum, c) => sum + c.cities.length, 0);
