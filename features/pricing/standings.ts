import { estimatePrice, priceStanding } from './estimate';

/**
 * Wie sich die Preise einer ganzen Trefferliste zum Markt verhalten.
 *
 * Auf der Fahrzeugseite wird je Fahrzeug einzeln geschaetzt -- dort ist das
 * eine Abfrage. Fuer eine Trefferliste mit vierundzwanzig Autos waeren es
 * vierundzwanzig Abfragen, jede ueber sechzig Vergleichszeilen. Deshalb kommen
 * die Vergleichsfahrzeuge hier in einem Zug und werden im Speicher nach Modell
 * sortiert.
 *
 * Das Rechnen selbst bleibt dieselbe Funktion wie auf der Fahrzeugseite: eine
 * Liste, die andere Zahlen liefert als das Inserat, auf das sie fuehrt, waere
 * schlimmer als gar keine Angabe.
 */

export type StandingItem = {
  id: string;
  modelId: string;
  priceCents: number;
  year: number | null;
  mileageKm: number | null;
};

export type StandingComparable = {
  id: string;
  modelId: string;
  priceCents: number;
  year: number | null;
  mileageKm: number | null;
};

export type Standing = 'below' | 'within' | 'above';

export function standingsFor(
  items: StandingItem[],
  comparables: StandingComparable[],
): Map<string, Standing> {
  const nachModell = new Map<string, StandingComparable[]>();

  for (const eintrag of comparables) {
    const liste = nachModell.get(eintrag.modelId);
    if (liste) liste.push(eintrag);
    else nachModell.set(eintrag.modelId, [eintrag]);
  }

  const ergebnis = new Map<string, Standing>();

  for (const item of items) {
    // Ein Fahrzeug gehoert nicht in seinen eigenen Vergleich: sonst zieht es
    // den Schnitt zu sich hin und liegt umso sicherer "im Rahmen".
    const vergleiche = (nachModell.get(item.modelId) ?? []).filter(
      (eintrag) => eintrag.id !== item.id,
    );

    const schaetzung = estimatePrice({
      year: item.year,
      mileageKm: item.mileageKm,
      comparables: vergleiche.map((eintrag) => ({
        priceCents: eintrag.priceCents,
        year: eintrag.year,
        mileageKm: eintrag.mileageKm,
      })),
    });

    // Zu wenige Vergleiche: kein Siegel. Eine geratene Aussage ist hier
    // schlechter als keine -- der Kaeufer trifft danach eine Kaufentscheidung.
    if (!schaetzung) continue;

    ergebnis.set(item.id, priceStanding(item.priceCents, schaetzung));
  }

  return ergebnis;
}
