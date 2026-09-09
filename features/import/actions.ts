'use server';

import { revalidatePath } from 'next/cache';
import { getTranslations } from 'next-intl/server';

import { saveListingAction, publishListingAction } from '@/features/listings/actions';
import { countBillableListings, getLimits } from '@/features/packages/queries';
import { fail, ok, type ActionResult } from '@/lib/action-result';
import { requireDealer } from '@/lib/auth/guards';
import { prisma } from '@/lib/db';
import { buildImageKey, getStorage } from '@/lib/storage';

import { matchBrand, matchCity, matchModel, modelSuggestions } from './catalog';
import { parseCsv } from './csv';
import { fetchRemoteImage } from './remote-image';
import {
  IMPORT_CONCURRENCY, MAX_IMPORT_ROWS,
  type ImportAnalysis, type ImportProblem, type ImportRowReport, type ImportRunResult,
} from './report';
import { prepareFile, type PreparedRow } from './rows';

/**
 * Bestandsliste eines Haendlers einlesen.
 *
 * Zwei Schritte, und das ist der Kern: erst wird gezeigt, was entstehen wuerde,
 * dann wird es angelegt. Vierzig Inserate aus einer Datei zu erzeugen, die
 * niemand vorher gesehen hat, geht genau einmal gut.
 *
 * Angelegt wird ueber `saveListingAction` -- dieselbe Funktion, die auch der
 * Inserats-Assistent benutzt. Ein eigener, schnellerer Weg waere verlockend und
 * falsch: er wuerde an Bewertung, Qualitaetsbewertung und Preisverlauf
 * vorbeilaufen, und der Unterschied faellt erst auf, wenn der Bestand schon
 * drin ist.
 */

type Katalog = {
  brands: { id: string; slug: string; name: string }[];
  models: { id: string; slug: string; name: string; brandSlug: string }[];
  cities: { id: string; slug: string; name: string }[];
};

async function ladeKatalog(): Promise<Katalog> {
  const [brands, models, cities] = await Promise.all([
    prisma.brand.findMany({ select: { id: true, slug: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.model.findMany({
      select: { id: true, slug: true, name: true, brand: { select: { slug: true } } },
      orderBy: { name: 'asc' },
    }),
    prisma.city.findMany({ select: { id: true, slug: true, name: true } }),
  ]);

  return {
    brands,
    models: models.map((model) => ({
      id: model.id,
      slug: model.slug,
      name: model.name,
      brandSlug: model.brand.slug,
    })),
    cities,
  };
}

type Aufgeloest = {
  row: PreparedRow;
  brandSlug: string | null;
  modelSlug: string | null;
  citySlug: string | null;
  problems: ImportProblem[];
};

function loeseAuf(row: PreparedRow, katalog: Katalog): Aufgeloest {
  const problems: ImportProblem[] = [...row.problems];

  const brand = matchBrand(row.brandName, katalog.brands);
  if (!brand && row.brandName !== '') {
    problems.push({ field: 'brand', code: 'unknownBrand' });
  }

  const model = brand ? matchModel(row.modelName, brand.slug, katalog.models) : null;
  if (brand && !model && row.modelName !== '') {
    problems.push({
      field: 'model',
      code: 'unknownModel',
      detail: modelSuggestions(brand.slug, katalog.models).join(', '),
    });
  }

  const city = matchCity(row.cityName, katalog.cities);
  if (!city && row.cityName !== '') {
    problems.push({ field: 'city', code: 'unknownCity' });
  }

  return {
    row,
    brandSlug: brand?.slug ?? null,
    modelSlug: model?.slug ?? null,
    citySlug: city?.slug ?? null,
    problems,
  };
}

function beschriftung(row: PreparedRow): string {
  const teile = [row.brandName, row.modelName].filter((teil) => teil !== '');
  const jahr = row.values?.registrationYear;
  const name = teile.join(' ') || `Rreshti ${row.line}`;
  return jahr ? `${name} · ${jahr}` : name;
}

function bericht(eintrag: Aufgeloest): ImportRowReport {
  return {
    line: eintrag.row.line,
    label: beschriftung(eintrag.row),
    problems: eintrag.problems,
    descriptionGenerated: eintrag.row.descriptionGenerated,
    imageCount: eintrag.row.imageUrls.length,
  };
}

/**
 * Liest die Datei und loest alle Namen auf, ohne etwas zu speichern.
 *
 * Wird von beiden Aktionen benutzt: die zweite prueft die Datei noch einmal von
 * vorne, statt der Oberflaeche zu glauben. Was der Browser schickt, ist keine
 * Grundlage fuer vierzig neue Datensaetze.
 */
async function analysiere(csv: string, generateDescription: boolean) {
  const t = await getTranslations('vehicles');
  const ti = await getTranslations('import');

  const tabelle = parseCsv(csv);

  const datei = prepareFile(tabelle.header, tabelle.rows, {
    generateDescription,
    describe: (parts) =>
      ti('generatedDescription', {
        vehicle: [parts.brand, parts.model, parts.variant].filter(Boolean).join(' '),
        year: String(parts.year),
        km: parts.mileageKm.toLocaleString('de-DE'),
        fuel: t(`fuel.${parts.fuel}`),
        transmission: t(`transmission.${parts.transmission}`),
        hp: String(Math.round(parts.powerKw * 1.35962)),
      }),
  });

  const katalog = await ladeKatalog();
  const aufgeloest = datei.rows.map((row) => loeseAuf(row, katalog));

  return { tabelle, datei, aufgeloest };
}

export async function analyseImportAction(
  csv: string,
  generateDescription: boolean,
): Promise<ActionResult<ImportAnalysis>> {
  const user = await requireDealer();
  const ti = await getTranslations('import');

  if (csv.trim() === '') return fail(ti('errorEmpty'));

  const { datei, aufgeloest } = await analysiere(csv, generateDescription);

  if (datei.missingColumns.length === 0 && aufgeloest.length === 0) {
    return fail(ti('errorNoRows'));
  }

  if (aufgeloest.length > MAX_IMPORT_ROWS) {
    return fail(ti('errorTooManyRows', { max: MAX_IMPORT_ROWS }));
  }

  const [limits, benutzt] = await Promise.all([
    getLimits(user.id),
    countBillableListings(user.id),
  ]);

  const bereit = aufgeloest.filter((eintrag) => eintrag.problems.length === 0);

  return ok({
    totalRows: aufgeloest.length,
    readyCount: bereit.length,
    unknownColumns: datei.unknownColumns,
    missingColumns: datei.missingColumns,
    rows: aufgeloest.map(bericht),
    freeSlots: limits.listingLimit === null ? null : Math.max(0, limits.listingLimit - benutzt),
    photoLimit: limits.photoLimit,
  });
}

/**
 * Laedt die Fotos einer Zeile herunter und legt sie im Dateispeicher ab.
 *
 * Ein Foto, das nicht kommt, laesst das Inserat nicht scheitern -- solange
 * mindestens eines ankommt. Die Zahl der fehlgeschlagenen steht danach im
 * Bericht, damit der Haendler sie nachtragen kann.
 */
async function holeBilder(
  urls: string[],
  userId: string,
  photoLimit: number,
): Promise<{ images: { key: string; url: string }[]; failed: number }> {
  const storage = getStorage();
  const images: { key: string; url: string }[] = [];
  let failed = 0;

  for (const adresse of urls.slice(0, photoLimit)) {
    const geladen = await fetchRemoteImage(adresse);

    if (!geladen.ok) {
      failed++;
      continue;
    }

    const abgelegt = await storage.put({
      key: buildImageKey(userId, geladen.format),
      body: geladen.bytes,
      contentType: geladen.mime,
    });

    images.push({ key: abgelegt.key, url: abgelegt.url });
  }

  return { images, failed };
}

/** Arbeitet eine Liste mit begrenzter Gleichzeitigkeit ab. */
async function nacheinander<T, R>(
  eintraege: T[],
  gleichzeitig: number,
  arbeit: (eintrag: T) => Promise<R>,
): Promise<R[]> {
  const ergebnisse: R[] = [];

  for (let i = 0; i < eintraege.length; i += gleichzeitig) {
    const teil = eintraege.slice(i, i + gleichzeitig);
    ergebnisse.push(...(await Promise.all(teil.map(arbeit))));
  }

  return ergebnisse;
}

export async function runImportAction(
  csv: string,
  generateDescription: boolean,
  publish: boolean,
): Promise<ActionResult<ImportRunResult>> {
  const user = await requireDealer();
  const ti = await getTranslations('import');

  if (csv.trim() === '') return fail(ti('errorEmpty'));

  const { aufgeloest } = await analysiere(csv, generateDescription);

  if (aufgeloest.length > MAX_IMPORT_ROWS) {
    return fail(ti('errorTooManyRows', { max: MAX_IMPORT_ROWS }));
  }

  const [limits, benutzt] = await Promise.all([
    getLimits(user.id),
    countBillableListings(user.id),
  ]);

  let bereit = aufgeloest.filter(
    (eintrag) => eintrag.problems.length === 0 && eintrag.row.values !== null,
  );

  // Dieselbe Datei ein zweites Mal einzulesen darf den Bestand nicht
  // verdoppeln. Erkannt wird an der Fahrgestellnummer -- sie ist das einzige
  // Merkmal, das ein Fahrzeug eindeutig benennt.
  const vins = bereit
    .map((eintrag) => eintrag.row.values?.vin)
    .filter((vin): vin is string => Boolean(vin));

  const vorhanden = vins.length
    ? new Set(
        (
          await prisma.vehicle.findMany({
            where: { sellerId: user.id, vin: { in: vins } },
            select: { vin: true },
          })
        )
          .map((row) => row.vin)
          .filter((vin): vin is string => Boolean(vin)),
      )
    : new Set<string>();

  const doppelt = bereit.filter(
    (eintrag) => eintrag.row.values?.vin && vorhanden.has(eintrag.row.values.vin),
  );
  bereit = bereit.filter(
    (eintrag) => !(eintrag.row.values?.vin && vorhanden.has(eintrag.row.values.vin)),
  );

  // Die Paketgrenze gilt hier genauso wie beim einzelnen Inserat.
  const frei = limits.listingLimit === null ? bereit.length : Math.max(0, limits.listingLimit - benutzt);
  const zuViel = Math.max(0, bereit.length - frei);
  const zuAnlegen = bereit.slice(0, frei);

  const failed: ImportRunResult['failed'] = doppelt.map((eintrag) => ({
    line: eintrag.row.line,
    label: beschriftung(eintrag.row),
    reason: ti('problems.duplicateVin'),
  }));
  const imageWarnings: ImportRunResult['imageWarnings'] = [];
  const angelegt: string[] = [];

  await nacheinander(zuAnlegen, IMPORT_CONCURRENCY, async (eintrag) => {
    const werte = eintrag.row.values;
    if (!werte) return;

    const { images, failed: fehlgeschlagen } = await holeBilder(
      eintrag.row.imageUrls,
      user.id,
      limits.photoLimit,
    );

    if (images.length === 0) {
      failed.push({
        line: eintrag.row.line,
        label: beschriftung(eintrag.row),
        reason: ti('problems.noImageLoaded'),
      });
      return;
    }

    if (fehlgeschlagen > 0) {
      imageWarnings.push({
        line: eintrag.row.line,
        label: beschriftung(eintrag.row),
        failed: fehlgeschlagen,
      });
    }

    const ergebnis = await saveListingAction({
      ...werte,
      category: 'CAR',
      brandSlug: eintrag.brandSlug,
      modelSlug: eintrag.modelSlug,
      citySlug: eintrag.citySlug,
      features: [],
      images,
      hideExactAddress: true,
    });

    if (!ergebnis.ok) {
      failed.push({
        line: eintrag.row.line,
        label: beschriftung(eintrag.row),
        reason: ergebnis.error,
      });
      return;
    }

    angelegt.push(ergebnis.data.id);
  });

  let veroeffentlicht = 0;

  if (publish) {
    // Nacheinander und ueber denselben Weg wie sonst: die automatische
    // Pruefung entscheidet je Inserat, ob es sofort sichtbar wird oder auf
    // eine Freigabe wartet.
    for (const id of angelegt) {
      const ergebnis = await publishListingAction(id);
      if (ergebnis.ok) veroeffentlicht++;
    }
  }

  revalidatePath('/dashboard/listings');

  return ok({
    created: angelegt.length,
    published: veroeffentlicht,
    failed,
    imageWarnings,
    skippedForLimit: zuViel,
  });
}
