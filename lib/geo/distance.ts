export type Coordinates = { lat: number; lng: number };

const EARTH_RADIUS_KM = 6371;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/** Entfernung zweier Punkte auf der Erdkugel in Kilometern. */
export function haversineKm(a: Coordinates, b: Coordinates): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export type BoundingBox = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

/**
 * Umschliessendes Rechteck fuer einen Radius. Es dient als schneller Vorfilter
 * ueber den Index auf lat/lng; die genaue Kreisform stellt danach der
 * Haversine-Vergleich her.
 */
export function boundingBox(center: Coordinates, radiusKm: number): BoundingBox {
  const latDelta = radiusKm / 111.32;

  // Laengengrade ruecken zu den Polen hin zusammen.
  const cosLat = Math.cos(toRadians(center.lat));
  const lngDelta = radiusKm / (111.32 * Math.max(0.01, Math.abs(cosLat)));

  return {
    minLat: center.lat - latDelta,
    maxLat: center.lat + latDelta,
    minLng: center.lng - lngDelta,
    maxLng: center.lng + lngDelta,
  };
}

/** Rundet fuer die Anzeige: unter 10 km auf eine Nachkommastelle, sonst ganz. */
export function formatDistanceKm(km: number): string {
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
}
