/**
 * Ordnet die Namen aus der Haendlerdatei den Eintraegen im Katalog zu.
 *
 * Ein Haendler schreibt "Mercedes Benz", "VW" oder "Prishtina" -- im Katalog
 * stehen "Mercedes-Benz", "Volkswagen" und "Prishtinë". Die Zuordnung ist
 * bewusst eine reine Funktion: welche Marken es gibt, holt der Aufrufer.
 */

import { normalizeHeader } from './columns';

export type CatalogBrand = { id: string; slug: string; name: string };
export type CatalogModel = { id: string; slug: string; name: string; brandSlug: string };
export type CatalogCity = { id: string; slug: string; name: string };

/**
 * Schreibweisen, die haeufig genug vorkommen, um sie zu kennen.
 *
 * Nur echte Zweitnamen derselben Marke -- nichts, was raten waere.
 */
const BRAND_ALIASES: Record<string, string> = {
  vw: 'volkswagen',
  mercedes: 'mercedesbenz',
  merc: 'mercedesbenz',
  mb: 'mercedesbenz',
  landrover: 'landrover',
  vwnutzfahrzeuge: 'volkswagen',
  alfa: 'alfaromeo',
};

const vergleich = (wert: string) => normalizeHeader(wert);

export function matchBrand(raw: string, brands: CatalogBrand[]): CatalogBrand | null {
  const wert = vergleich(raw);
  if (wert === '') return null;

  const gesucht = BRAND_ALIASES[wert] ?? wert;

  return (
    brands.find((brand) => vergleich(brand.name) === gesucht) ??
    brands.find((brand) => vergleich(brand.slug) === gesucht) ??
    null
  );
}

/**
 * Findet das Modell innerhalb der bereits erkannten Marke.
 *
 * Drei Stufen, von streng nach nachsichtig:
 *
 * 1. Genau derselbe Name oder dieselbe Kennung.
 * 2. Der Katalogname steckt im Feld des Haendlers -- "A4 Avant" trifft "A4".
 * 3. Das Feld des Haendlers steckt im Katalognamen -- "C" trifft "C-Klasse".
 *
 * Bei Stufe 2 und 3 gewinnt der laengste Treffer: sonst wuerde "A4" auch von
 * "A" beansprucht, und "X5" von "X".
 *
 * Was hier scheitert, wird nicht geraten. Ein BMW 320d landet nicht von selbst
 * beim 3er -- der Haendler bekommt in der Vorschau die Liste der Modelle
 * dieser Marke und traegt sie einmal richtig ein.
 */
export function matchModel(
  raw: string,
  brandSlug: string,
  models: CatalogModel[],
): CatalogModel | null {
  const wert = vergleich(raw);
  if (wert === '') return null;

  const eigene = models.filter((model) => model.brandSlug === brandSlug);

  const genau =
    eigene.find((model) => vergleich(model.name) === wert) ??
    eigene.find((model) => vergleich(model.slug) === wert);
  if (genau) return genau;

  const enthalten = eigene
    .filter((model) => {
      const name = vergleich(model.name);
      return name.length >= 2 && (wert.includes(name) || name.includes(wert));
    })
    .sort((a, b) => vergleich(b.name).length - vergleich(a.name).length);

  return enthalten[0] ?? null;
}

/**
 * Ortsnamen ohne den auslautenden Vokal.
 *
 * Albanisch hat eine bestimmte und eine unbestimmte Form desselben Namens:
 * Prishtinë und Prishtina, Tiranë und Tirana, Gjilan und Gjilani. Beide stehen
 * in Haendlerdateien, und beide meinen dieselbe Stadt. Ein Vergleich der
 * Zeichenketten trennt sie; ein Vergleich ohne den letzten Vokal nicht.
 */
function ortsstamm(wert: string): string {
  return wert.replace(/[aeiu]$/, '');
}

export function matchCity(raw: string, cities: CatalogCity[]): CatalogCity | null {
  const wert = vergleich(raw);
  if (wert === '') return null;

  const genau =
    cities.find((city) => vergleich(city.name) === wert) ??
    cities.find((city) => vergleich(city.slug) === wert);
  if (genau) return genau;

  const stamm = ortsstamm(wert);
  // Erst ab vier Zeichen: kuerzere Staemme treffen zu leicht daneben.
  if (stamm.length < 4) return null;

  return cities.find((city) => ortsstamm(vergleich(city.name)) === stamm) ?? null;
}

/** Vorschlaege fuer die Fehlermeldung, wenn ein Modell nicht gefunden wurde. */
export function modelSuggestions(brandSlug: string, models: CatalogModel[], take = 8): string[] {
  return models
    .filter((model) => model.brandSlug === brandSlug)
    .slice(0, take)
    .map((model) => model.name);
}
