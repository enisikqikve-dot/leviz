import type { BodyType } from '@/lib/generated/prisma/enums';

/**
 * Frei lizenzierte Fahrzeugfotos von Unsplash, jede Kennung vor dem Einbau auf
 * Erreichbarkeit geprueft und nach Karosserieform einsortiert.
 *
 * Die Einsortierung ist noetig, weil der frei verfuegbare Bestand stark zu
 * Sportwagen neigt. Ohne sie wuerde ein Fiat Panda mit einem Lamborghini
 * bebildert — und der Marktplatz saehe nicht nach dem aus, was im Kosovo und
 * in Albanien tatsaechlich gehandelt wird.
 *
 * `neutral` sind Aufnahmen ohne erkennbare Fahrzeugklasse (Detail, Nacht,
 * Landstrasse). Sie dienen als Auffuellung fuer jede Form.
 */
const PHOTOS = {
  compact: [
    '1549317661-bd32c8ce0db2', '1550355291-bbee04a92027', '1489824904134-891ab64532f1',
  ],
  sedan: [
    // Nach Sichtkontrolle: hier stehen nur Stufen- und Fliessheckformen.
    '1555215695-3004980ad54e', '1536700503339-1e4b06520771',
    '1560958089-b8a1929cea89', '1638618164682-12b986ec2a75',
  ],
  suv: [
    '1533473359331-0135ef1b58bf', '1519641471654-76ce0107ad1b',
  ],
  sport: [
    // In Kartengroesse von einem Supersportwagen nicht zu unterscheiden.
    '1600712242805-5f78671b24da',
    // Camaro, M4-Coupé und ein weiteres Coupé, zuvor faelschlich als Limousine
    // eingeordnet — sie sind auf einem Kleinwagen sofort als falsch erkennbar.
    '1552519507-da3b142c6e3d', '1502877338535-766e1452684a',
    '1570356528233-b442cf2de345',
    '1503376780353-7e6692767b70', '1494976388531-d1058494cdd8', '1583121274602-3e2820c69888',
    '1580273916550-e323be2ae537', '1618843479313-40f8afb4b4d8', '1605559424843-9e4c228bf1c2',
    '1511919884226-fd3cad34687c', '1616788494707-ec28f08d05a1', '1544636331-e26879cd4d9b',
    '1553440569-bcc63803a83d', '1571607388263-1044f9ea01dd', '1542362567-b07e54358753',
    '1547744152-14d985cb937f', '1562911791-c7a97b729ec5', '1621007947382-bb3c3994e3fb',
    '1631295868223-63265b40d9e4', '1568605117036-5fe5e7bab0b7', '1492144534655-ae79c964c9d7',
    '1573950940509-d924ee3fd345', '1590362891991-f776e747a588', '1626668893632-6f3a4466d22f',
  ],
  neutral: [
    // Aufnahmen ohne erkennbare Fahrzeugklasse.
    '1517524008697-84bbe3c3fd98', '1609521263047-f8f205293f24', '1617195737496-bc30194e3a19',
  ],
} as const;

type PhotoGroup = keyof typeof PHOTOS;

const GROUP_BY_BODY: Record<BodyType, PhotoGroup> = {
  HATCHBACK: 'compact',
  SEDAN: 'sedan',
  ESTATE: 'sedan',
  SUV: 'suv',
  PICKUP: 'suv',
  COUPE: 'sport',
  CONVERTIBLE: 'sport',
  VAN: 'neutral',
  MINIBUS: 'neutral',
  TRUCK: 'neutral',
  CHASSIS: 'neutral',
  OTHER: 'neutral',
};

export const PHOTO_COUNT = Object.values(PHOTOS).flat().length;

/** Nur fuer Tests: die Kennungen der Sportwagenaufnahmen. */
export const SPORT_PHOTO_IDS: readonly string[] = PHOTOS.sport;

/**
 * Zuschnitte, damit dieselbe Aufnahme nicht zweimal identisch aussieht.
 * Bewusst ohne `faces`: bei Fahrzeugfotos zoomt Unsplash sonst auf zufaellig
 * mitfotografierte Personen statt auf das Auto.
 */
const CROPS = ['entropy', 'edges', 'center'] as const;

function url(id: string, cropIndex: number, width: number, height: number): string {
  const crop = CROPS[cropIndex % CROPS.length];
  return `https://images.unsplash.com/photo-${id}?w=${width}&h=${height}&q=75&auto=format&fit=crop&crop=${crop}`;
}

/**
 * Auffuellbestand fuer Alltagsfahrzeuge — bewusst ohne die Sportwagenbilder.
 * Lieber dieselbe Limousine mehrfach als ein Ferrari ueber einem Skoda Karoq:
 * der Marktplatz haette sonst eine Bebilderung, die dem gehandelten Bestand
 * offen widerspricht.
 */
const EVERYDAY_PHOTOS: readonly string[] = [
  ...PHOTOS.compact, ...PHOTOS.sedan, ...PHOTOS.suv, ...PHOTOS.neutral,
];

/**
 * Stimmungsbilder ohne sichtbares Fahrzeug — naechtliche Tankstelle, leere
 * Landstrasse. Als Beibild taugen sie, als Hauptbild eines Inserats nicht:
 * die Trefferliste zeigt dann eine Karte ohne Auto.
 */
const ATMOSPHERE_ONLY = new Set([
  '1609521263047-f8f205293f24', '1617195737496-bc30194e3a19',
]);

/** Mindestgroesse, ab der eine Formgruppe eigenstaendig genug Auswahl bietet. */
const MIN_GROUP_SIZE = 6;

/**
 * Bildstrecke fuer ein Inserat.
 *
 * Formgerechte Auswahl nur dort, wo die Gruppe gross genug ist. Der frei
 * verfuegbare Bestand enthaelt kaum Alltagsfahrzeuge: fuer SUV, Kleinwagen und
 * Transporter gibt es zu wenige Aufnahmen. Diese Formen greifen deshalb auf
 * den gemeinsamen Alltagsbestand zurueck — und nie auf die Sportwagenbilder.
 */
export function galleryFor(
  offset: number,
  count: number,
  bodyType: BodyType | null,
): string[] {
  const group = bodyType ? GROUP_BY_BODY[bodyType] : 'neutral';
  const preferred = PHOTOS[group];
  const pool = preferred.length >= MIN_GROUP_SIZE ? preferred : EVERYDAY_PHOTOS;

  const gallery = Array.from({ length: count }, (_, i) => {
    const index = offset * 5 + i * 3;
    return { id: pool[index % pool.length], crop: Math.floor(index / pool.length) + i };
  });

  // Das Hauptbild der Trefferliste muss ein Fahrzeug zeigen. Getauscht wird
  // innerhalb der Strecke, damit die Auswahl eine Permutation bleibt und keine
  // Aufnahme doppelt vorkommt.
  if (ATMOSPHERE_ONLY.has(gallery[0].id)) {
    const swapIndex = gallery.findIndex((entry) => !ATMOSPHERE_ONLY.has(entry.id));
    if (swapIndex > 0) {
      [gallery[0], gallery[swapIndex]] = [gallery[swapIndex], gallery[0]];
    }
  }

  return gallery.map((entry) => url(entry.id, entry.crop, 1200, 800));
}
