import 'dotenv/config';

import { hashPassword } from '../lib/auth/password.js';
import { prisma } from '../lib/db/index.js';
import { BRANDS } from './seed/brands.js';
import { COUNTRIES } from './seed/geo.js';
import { mayWriteDemoContent } from './seed/guard.js';
import { createRandom } from './seed/random.js';

/** Fester Startwert: derselbe Aufruf erzeugt immer dieselben Daten. */
const random = createRandom(20260831);

const DEMO_PASSWORD = 'Leviz2026!';

function log(step: string, detail: string | number = '') {
  console.log(`  ${step.padEnd(34)} ${detail}`);
}

/**
 * Raeumt in Abhaengigkeitsreihenfolge auf. Der Seed-Lauf muss beliebig oft
 * wiederholbar sein, ohne Reste zu hinterlassen.
 */
async function clearDatabase() {
  await prisma.$transaction([
    prisma.message.deleteMany(),
    prisma.conversation.deleteMany(),
    prisma.listingInquiry.deleteMany(),
    prisma.listingView.deleteMany(),
    prisma.favorite.deleteMany(),
    prisma.report.deleteMany(),
    prisma.priceHistory.deleteMany(),
    prisma.vehicleFeature.deleteMany(),
    prisma.vehicleImage.deleteMany(),
    prisma.vehicle.deleteMany(),
    prisma.review.deleteMany(),
    prisma.dealerVerification.deleteMany(),
    prisma.dealer.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.savedSearch.deleteMany(),
    prisma.searchHistory.deleteMany(),
    prisma.priceEstimate.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.subscription.deleteMany(),
    prisma.passwordResetToken.deleteMany(),
    prisma.phoneVerification.deleteMany(),
    prisma.session.deleteMany(),
    prisma.account.deleteMany(),
    prisma.profile.deleteMany(),
    prisma.user.deleteMany(),
    prisma.vehicleVariant.deleteMany(),
    prisma.model.deleteMany(),
    prisma.brand.deleteMany(),
    prisma.feature.deleteMany(),
    prisma.city.deleteMany(),
    prisma.country.deleteMany(),
    prisma.package.deleteMany(),
    prisma.platformSetting.deleteMany(),
  ]);
}

/** Was am Katalog hängt und ihn nicht neu aufbauen lässt. */
async function countExistingContent() {
  const [vehicles, dealers, payments, subscriptions] = await Promise.all([
    prisma.vehicle.count(),
    prisma.dealer.count(),
    prisma.payment.count(),
    prisma.subscription.count(),
  ]);

  return {
    vehicles,
    dealers,
    payments: payments + subscriptions,
    total: vehicles + dealers + payments + subscriptions,
  };
}

/**
 * Leert nur die Nachschlagewerke — Marken, Modelle, Städte, Pakete. Nutzer und
 * ihre Inhalte bleiben unberührt.
 */
async function clearCatalog() {
  await prisma.$transaction([
    prisma.vehicleVariant.deleteMany(),
    prisma.model.deleteMany(),
    prisma.brand.deleteMany(),
    prisma.feature.deleteMany(),
    prisma.city.deleteMany(),
    prisma.country.deleteMany(),
    prisma.package.deleteMany(),
    prisma.platformSetting.deleteMany(),
  ]);
}

async function seedGeography() {
  const cityIds = new Map<string, string>();
  const countryIds = new Map<string, string>();

  for (const country of COUNTRIES) {
    const created = await prisma.country.create({
      data: {
        code: country.code,
        nameSq: country.nameSq,
        nameDe: country.nameDe,
        nameEn: country.nameEn,
        phonePrefix: country.phonePrefix,
        currency: country.currency,
        isCoreMarket: country.isCoreMarket,
        isImportOrigin: country.isImportOrigin,
        sortOrder: country.sortOrder,
        cities: {
          create: country.cities.map((city) => ({
            slug: city.slug,
            name: city.name,
            region: city.region,
            postalCode: city.postalCode,
            lat: city.lat,
            lng: city.lng,
            population: city.population,
          })),
        },
      },
      include: { cities: { select: { id: true, slug: true } } },
    });

    countryIds.set(country.code, created.id);
    for (const city of created.cities) cityIds.set(city.slug, city.id);
  }

  log('Länder und Städte', `${countryIds.size} / ${cityIds.size}`);
  return { countryIds, cityIds };
}

async function seedBrands() {
  const brandIds = new Map<string, string>();
  const modelIds = new Map<string, string>();

  for (const [index, brand] of BRANDS.entries()) {
    const created = await prisma.brand.create({
      data: {
        slug: brand.slug,
        name: brand.name,
        popular: brand.popular,
        sortOrder: index,
        categories: [
          ...new Set(brand.models.map((model) => model.category ?? 'CAR')),
        ],
        models: {
          create: brand.models.map((model, modelIndex) => ({
            slug: model.slug,
            name: model.name,
            category: model.category ?? 'CAR',
            bodyTypes: model.bodyTypes,
            yearFrom: model.yearFrom,
            popular: model.popular ?? false,
            sortOrder: modelIndex,
          })),
        },
      },
      include: { models: { select: { id: true, slug: true } } },
    });

    brandIds.set(brand.slug, created.id);
    for (const model of created.models) {
      modelIds.set(`${brand.slug}/${model.slug}`, model.id);
    }
  }

  log('Marken und Modelle', `${brandIds.size} / ${modelIds.size}`);
  return { brandIds, modelIds };
}

async function seedFeatures() {
  const { FEATURES } = await import('./seed/features.js');
  const featureIds = new Map<string, string>();

  for (const [index, feature] of FEATURES.entries()) {
    const created = await prisma.feature.create({
      data: {
        slug: feature.slug,
        nameSq: feature.nameSq,
        nameDe: feature.nameDe,
        nameEn: feature.nameEn,
        group: feature.group,
        categories: feature.categories,
        popular: feature.popular,
        sortOrder: index,
      },
      select: { id: true, slug: true },
    });
    featureIds.set(created.slug, created.id);
  }

  log('Ausstattungsmerkmale', featureIds.size);
  return featureIds;
}

async function seedPackages() {
  const { PACKAGES } = await import('./seed/packages.js');

  for (const item of PACKAGES) {
    await prisma.package.create({ data: item });
  }

  log('Pakete', PACKAGES.length);
}

async function seedSettings() {
  const settings = [
    // Der Kurs wird nur zur Anzeige benutzt; gespeichert wird immer in Euro-Cent.
    { key: 'currency.eurToAll', value: 100.5 },
    { key: 'listing.defaultDurationDays', value: 60 },
    { key: 'moderation.autoReviewNewSellers', value: true },
    { key: 'moderation.suspiciousPriceFloorCents', value: 50000 },
    { key: 'search.defaultRadiusKm', value: 50 },
    { key: 'search.pageSize', value: 24 },
  ];

  for (const setting of settings) {
    await prisma.platformSetting.create({ data: setting });
  }

  log('Plattform-Einstellungen', settings.length);
}

type SeededUser = { id: string; cityId: string; name: string; phone: string };

async function seedUsers(cityIds: Map<string, string>) {
  const { FIRST_NAMES_F, FIRST_NAMES_M, LAST_NAMES } = await import('./seed/people.js');
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  // Nur Städte der Kernmärkte als Wohnort der Privatnutzer.
  const coreCitySlugs = [...cityIds.keys()].filter(
    (slug) => !['stuttgart', 'muenchen', 'duesseldorf', 'hamburg', 'frankfurt',
      'zuerich', 'geneve', 'wien', 'graz', 'milano', 'bari', 'bruxelles',
      'antwerpen', 'zagreb', 'split', 'ljubljane'].includes(slug),
  );

  // --- Demo-Konten, im README dokumentiert --------------------------------
  const demo = [
    { email: 'admin@leviz.dev', name: 'Admin LEVIZ', role: 'SUPER_ADMIN' as const },
    { email: 'dealer@leviz.dev', name: 'Arben Krasniqi', role: 'DEALER' as const },
    { email: 'seller@leviz.dev', name: 'Fjolla Berisha', role: 'PRIVATE_SELLER' as const },
    { email: 'buyer@leviz.dev', name: 'Dardan Gashi', role: 'USER' as const },
  ];

  const demoUsers = new Map<string, SeededUser>();

  for (const [index, entry] of demo.entries()) {
    const citySlug = coreCitySlugs[index % coreCitySlugs.length];
    const cityId = cityIds.get(citySlug)!;
    const phone = `+3834${random.int(3, 9)}${random.int(100000, 999999)}`;

    const created = await prisma.user.create({
      data: {
        email: entry.email,
        emailVerified: new Date(),
        name: entry.name,
        phone,
        phoneVerified: new Date(),
        passwordHash,
        role: entry.role,
        locale: 'sq',
        trustScore: entry.role === 'SUPER_ADMIN' ? 100 : 75,
        createdAt: new Date(Date.now() - random.int(180, 420) * 86_400_000),
        profile: { create: { cityId } },
      },
      select: { id: true },
    });

    demoUsers.set(entry.email, { id: created.id, cityId, name: entry.name, phone });
  }

  // --- Weitere Nutzer ------------------------------------------------------
  const users: SeededUser[] = [];
  const usedEmails = new Set(demo.map((entry) => entry.email));

  for (let i = 0; i < 50; i += 1) {
    const first = random.chance(0.72)
      ? random.pick(FIRST_NAMES_M)
      : random.pick(FIRST_NAMES_F);
    const last = random.pick(LAST_NAMES);
    const name = `${first} ${last}`;

    let email = `${first}.${last}`.toLowerCase()
      .replaceAll('ë', 'e').replaceAll('ç', 'c') + '@example.com';
    let suffix = 2;
    while (usedEmails.has(email)) {
      email = `${first}.${last}${suffix}`.toLowerCase()
        .replaceAll('ë', 'e').replaceAll('ç', 'c') + '@example.com';
      suffix += 1;
    }
    usedEmails.add(email);

    const citySlug = random.pick(coreCitySlugs);
    const cityId = cityIds.get(citySlug)!;
    const phone = `+3834${random.int(3, 9)}${random.int(100000, 999999)}`;

    const created = await prisma.user.create({
      data: {
        email,
        emailVerified: random.chance(0.8) ? new Date() : null,
        name,
        phone,
        phoneVerified: random.chance(0.6) ? new Date() : null,
        passwordHash,
        role: random.chance(0.55) ? 'PRIVATE_SELLER' : 'USER',
        locale: random.weighted([
          { item: 'sq', weight: 80 },
          { item: 'de', weight: 12 },
          { item: 'en', weight: 8 },
        ]),
        trustScore: random.int(35, 85),
        createdAt: random.chance(0.06)
          ? new Date(Date.now() - random.int(1, 20) * 3_600_000)
          : new Date(Date.now() - random.int(20, 500) * 86_400_000),
        profile: { create: { cityId } },
      },
      select: { id: true },
    });

    users.push({ id: created.id, cityId, name, phone });
  }

  log('Nutzer', `${demoUsers.size} Demo + ${users.length} weitere`);
  return { demoUsers, users };
}

type SeededDealer = {
  id: string;
  userId: string;
  cityId: string;
  name: string;
  size: 'small' | 'medium' | 'large';
  verified: boolean;
};

async function seedDealers(
  cityIds: Map<string, string>,
  demoUsers: Map<string, SeededUser>,
) {
  const { DEALERS } = await import('./seed/people.js');
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const dealers: SeededDealer[] = [];

  const OPENING_HOURS = {
    mon: '08:00-19:00', tue: '08:00-19:00', wed: '08:00-19:00',
    thu: '08:00-19:00', fri: '08:00-19:00', sat: '09:00-16:00', sun: null,
  };

  const { FIRST_NAMES_F, FIRST_NAMES_M, LAST_NAMES } = await import('./seed/people.js');

  for (const [index, entry] of DEALERS.entries()) {
    const cityId = cityIds.get(entry.citySlug);
    if (!cityId) continue;

    // Autohaeuser sind etablierte Betriebe. Konto und Betrieb teilen sich das
    // Datum, damit auf dem Haendlerprofil nichts vor der Gruendung liegt.
    const establishedAt = new Date(Date.now() - random.int(240, 900) * 86_400_000);

    // Hinter der Firma steht eine Person, nicht die Firma selbst.
    const ownerName = `${
      random.chance(0.8) ? random.pick(FIRST_NAMES_M) : random.pick(FIRST_NAMES_F)
    } ${random.pick(LAST_NAMES)}`;

    // Das erste Autohaus gehoert dem Demo-Haendlerkonto.
    const isDemoDealer = index === 0;
    const ownerId = isDemoDealer
      ? demoUsers.get('dealer@leviz.dev')!.id
      : (
          await prisma.user.create({
            data: {
              email: `kontakt@${entry.slug}.example.com`,
              emailVerified: new Date(),
              name: ownerName,
              passwordHash,
              role: 'DEALER',
              locale: 'sq',
              trustScore: entry.verified ? 85 : 55,
              createdAt: establishedAt,
              profile: { create: { cityId } },
            },
            select: { id: true },
          })
        ).id;

    const created = await prisma.dealer.create({
      data: {
        userId: ownerId,
        slug: entry.slug,
        companyName: entry.name,
        legalName: `${entry.name} SH.P.K.`,
        registrationNumber: `81${random.int(100000, 999999)}`,
        description: entry.description,
        website: `https://www.${entry.slug}.example.com`,
        phone: `+3834${random.int(3, 9)}${random.int(100000, 999999)}`,
        publicEmail: `info@${entry.slug}.example.com`,
        cityId,
        postalCode: String(random.int(10000, 70000)),
        addressLine: `Rr. ${random.pick(['Dëshmorët e Kombit', 'Nëna Terezë', 'UÇK', 'Fehmi Agani', 'Bill Clinton'])} ${random.int(1, 180)}`,
        openingHours: OPENING_HOURS,
        createdAt: establishedAt,
        verification: entry.verified ? 'VERIFIED' : 'UNVERIFIED',
        // Die Pruefung erfolgt nach der Gruendung, nie davor.
        verifiedAt: entry.verified
          ? new Date(
              establishedAt.getTime() +
                random.int(1, 60) * 86_400_000,
            )
          : null,
      },
      select: { id: true },
    });

    dealers.push({
      id: created.id,
      userId: ownerId,
      cityId,
      name: entry.name,
      size: entry.size,
      verified: entry.verified,
    });
  }

  log('Händler', `${dealers.length} (${dealers.filter((d) => d.verified).length} verifiziert)`);
  return dealers;
}

async function seedVehicles(
  ids: {
    brandIds: Map<string, string>;
    modelIds: Map<string, string>;
    cityIds: Map<string, string>;
    countryIds: Map<string, string>;
    featureIds: Map<string, string>;
  },
  users: SeededUser[],
  dealers: SeededDealer[],
  demoUsers: Map<string, SeededUser>,
) {
  const { FEATURES } = await import('./seed/features.js');
  const { buildVehicle } = await import('./seed/vehicles.js');
  const { buildDescription } = await import('./seed/descriptions.js');
  const { galleryFor } = await import('./seed/photos.js');
  const { buildVehicleSlug, generatePublicCode } = await import('../features/vehicles/slug.js');
  const { buildVehicleTitle } = await import('../features/vehicles/format.js');
  const { calculateQualityScore } = await import('../features/vehicles/quality-score.js');

  const cities = await prisma.city.findMany({
    select: { id: true, slug: true, name: true, lat: true, lng: true, postalCode: true, countryId: true },
  });
  const cityById = new Map(cities.map((city) => [city.id, city]));

  const featureList = FEATURES.map((feature) => ({
    slug: feature.slug,
    frequency: feature.frequency,
    label: feature.nameSq,
  }));

  const brandPool = BRANDS.map((brand) => ({ item: brand, weight: brand.weight }));
  const INVENTORY = { small: [3, 6], medium: [7, 13], large: [14, 22] } as const;

  // Verkaeufer festlegen: Haendler stellen den Grossteil des Bestands.
  const assignments: { dealer?: SeededDealer; user?: SeededUser }[] = [];
  for (const dealer of dealers) {
    const [min, max] = INVENTORY[dealer.size];
    for (let i = 0; i < random.int(min, max); i += 1) assignments.push({ dealer });
  }
  const sellers = users.filter((_, index) => index % 2 === 0);
  for (const user of sellers) {
    for (let i = 0; i < random.int(1, 2); i += 1) assignments.push({ user });
  }

  // Das dokumentierte Demo-Verkaeuferkonto braucht eigene Inserate, sonst ist
  // seine Seite leer und der Ablauf "hervorheben" nicht vorfuehrbar.
  const demoSeller = demoUsers.get('seller@leviz.dev');
  if (demoSeller) {
    for (let i = 0; i < 3; i += 1) assignments.push({ user: demoSeller });
  }

  let created = 0;
  const usedSlugs = new Set<string>();

  /**
   * Jede Marke bekommt mindestens ein Inserat. Rein gewichtetes Ziehen laesst
   * seltene Marken sonst leer ausgehen, und der Markenfilter haette Eintraege,
   * die nie einen Treffer liefern.
   */
  const guaranteed = random.shuffle([...BRANDS]);

  for (const [index, assignment] of random.shuffle(assignments).entries()) {
    const brand = index < guaranteed.length
      ? guaranteed[index]
      : random.weighted(brandPool);
    const model = random.pick(brand.models);
    const built = buildVehicle(random, brand, model, featureList);

    const isDealer = Boolean(assignment.dealer);
    const sellerId = assignment.dealer?.userId ?? assignment.user!.id;
    const cityId = assignment.dealer?.cityId ?? assignment.user!.cityId;
    const city = cityById.get(cityId)!;

    const publicCode = generatePublicCode();
    let slug = buildVehicleSlug({
      brand: brand.name, model: model.name, variant: built.variantName,
      year: built.year, city: city.name, publicCode,
    });
    while (usedSlugs.has(slug)) slug = `${slug}-${random.int(10, 99)}`;
    usedSlugs.add(slug);

    const featureSlugs = built.features.map((feature) => feature.slug);
    // Bilder passend zur Karosserieform, damit kein Kleinwagen mit einem
    // Sportwagenfoto beworben wird.
    const photos = galleryFor(index, random.int(4, 9), built.bodyType);

    const description = buildDescription(random, {
      brand: brand.name, model: model.name, variant: built.variantName,
      year: built.year, mileageKm: built.mileageKm,
      customsStatus: built.customsStatus,
      serviceHistory: built.serviceHistory,
      accidentFree: built.accidentFree,
      importedFrom: built.importedFrom
        ? COUNTRIES.find((c) => c.code === built.importedFrom)?.nameSq
        : undefined,
      features: built.features.map((feature) => feature.label),
      isDealer,
      city: city.name,
    });

    const quality = calculateQualityScore({
      photoCount: photos.length,
      descriptionLength: description.length,
      featureCount: featureSlugs.length,
      hasMileage: true, hasFirstRegistration: true, hasFuel: true,
      hasTransmission: true, hasPower: true, hasBodyType: true,
      hasDriveType: true, hasColor: true,
      hasCustomsStatus: built.customsStatus !== 'NOT_APPLICABLE',
      hasServiceHistory: built.serviceHistory,
      hasAccidentInfo: true,
      hasVin: random.chance(0.45),
      sellerVerified: assignment.dealer?.verified ?? false,
    });

    const publishedAt = new Date(Date.now() - random.int(0, 75) * 86_400_000);
    const isFeatured = random.chance(isDealer ? 0.12 : 0.04);

    await prisma.vehicle.create({
      data: {
        slug, publicCode,
        sellerId,
        dealerId: assignment.dealer?.id ?? null,
        sellerType: isDealer ? 'DEALER' : 'PRIVATE',
        category: model.category ?? 'CAR',
        brandId: ids.brandIds.get(brand.slug)!,
        modelId: ids.modelIds.get(`${brand.slug}/${model.slug}`)!,
        title: buildVehicleTitle(brand.name, model.name, built.variantName),
        condition: built.condition,
        status: 'ACTIVE',
        priceCents: built.priceCents,
        negotiable: built.negotiable,
        vatDeductible: built.vatDeductible,
        financingAvailable: built.financingAvailable,
        firstRegistration: new Date(built.year, random.int(0, 11), random.int(1, 28)),
        mileageKm: built.mileageKm,
        fuel: built.fuel,
        transmission: built.transmission,
        powerKw: built.powerKw,
        bodyType: built.bodyType,
        driveType: built.driveType,
        doors: built.doors,
        seats: built.seats,
        cylinders: built.cylinders,
        displacementCcm: built.displacementCcm,
        color: built.color,
        interiorColor: built.interiorColor,
        emissionClass: built.emissionClass,
        co2Gkm: built.co2Gkm,
        consumptionCombined: built.consumptionCombined,
        electricRangeKm: built.electricRangeKm,
        batteryCapacityKwh: built.batteryCapacityKwh,
        customsStatus: built.customsStatus,
        plateOrigin: built.plateOrigin,
        importedFromId: built.importedFrom
          ? (ids.countryIds.get(built.importedFrom) ?? null)
          : null,
        registeredUntil: built.plateOrigin === 'NONE' ? null
          : new Date(Date.now() + random.int(-40, 330) * 86_400_000),
        steeringSide: built.steeringSide,
        accidentFree: built.accidentFree,
        serviceHistory: built.serviceHistory,
        warrantyMonths: built.warrantyMonths,
        ownersCount: built.ownersCount,
        description,
        countryId: city.countryId,
        cityId: city.id,
        postalCode: city.postalCode,
        lat: city.lat + random.float(-0.03, 0.03, 4),
        lng: city.lng + random.float(-0.03, 0.03, 4),
        qualityScore: quality.score,
        featuredScore: isFeatured ? random.pick([40, 80]) : 0,
        featuredUntil: isFeatured ? new Date(Date.now() + random.int(2, 14) * 86_400_000) : null,
        viewCount: random.int(4, 900),
        favoriteCount: random.int(0, 40),
        inquiryCount: random.int(0, 18),
        publishedAt,
        createdAt: publishedAt,
        expiresAt: new Date(publishedAt.getTime() + 60 * 86_400_000),
        images: {
          create: photos.map((url, position) => ({
            url, position, isMain: position === 0,
            width: 1200, height: 800,
            altText: `${brand.name} ${model.name} ${built.variantName}`,
          })),
        },
        features: {
          create: featureSlugs
            .map((featureSlug) => ids.featureIds.get(featureSlug))
            .filter((id): id is string => Boolean(id))
            .map((featureId) => ({ featureId })),
        },
      },
    });

    created += 1;
  }

  // Rangwerte einmal nachziehen. Dieselbe Funktion laeuft spaeter nach jeder
  // Aenderung an Qualitaet, Hervorhebung oder Verkaeufervertrauen.
  const { refreshRankScores } = await import('../features/vehicles/rank.js');
  const ranked = await refreshRankScores();

  log('Fahrzeuge', created);
  log('Rangwerte berechnet', ranked);
  return created;
}

async function seedInteractions(users: SeededUser[], demoUsers: Map<string, SeededUser>) {
  const vehicles = await prisma.vehicle.findMany({
    select: { id: true, sellerId: true, title: true, priceCents: true },
    take: 400,
  });

  const buyers = [demoUsers.get('buyer@leviz.dev')!, ...users.slice(0, 25)];
  let favorites = 0;
  let conversations = 0;
  let reviews = 0;

  // --- Merklisten ----------------------------------------------------------
  for (const buyer of buyers) {
    const picked = random.shuffle(vehicles).slice(0, random.int(2, 9));
    for (const vehicle of picked) {
      if (vehicle.sellerId === buyer.id) continue;
      await prisma.favorite.create({
        data: { userId: buyer.id, vehicleId: vehicle.id },
      });
      favorites += 1;
    }
  }

  // --- Gespraeche ----------------------------------------------------------
  const OPENERS = [
    'Përshëndetje, a është ende në dispozicion?',
    'A ka mundësi për shikim këtë fundjavë?',
    'Sa është çmimi i fundit?',
    'A është e doganuar plotësisht?',
    'A keni librin e servisit?',
  ];
  const REPLIES = [
    'Përshëndetje, po, vetura është ende në shitje.',
    'Sigurisht, mund të vini kur t\u0027ju përshtatet.',
    'Çmimi është pak i diskutueshëm për blerës serioz.',
    'Po, të gjitha dokumentet janë në rregull.',
  ];

  for (const buyer of buyers.slice(0, 18)) {
    const vehicle = random.pick(vehicles);
    if (vehicle.sellerId === buyer.id) continue;

    const lastMessageAt = new Date(Date.now() - random.int(0, 20) * 86_400_000);

    await prisma.conversation.create({
      data: {
        vehicleId: vehicle.id,
        buyerId: buyer.id,
        sellerId: vehicle.sellerId,
        lastMessageAt,
        buyerReadAt: lastMessageAt,
        messages: {
          create: [
            { senderId: buyer.id, body: random.pick(OPENERS), createdAt: new Date(lastMessageAt.getTime() - 3_600_000) },
            { senderId: vehicle.sellerId, body: random.pick(REPLIES), createdAt: lastMessageAt },
          ],
        },
      },
    });
    conversations += 1;
  }

  // --- Aufrufe über die letzten 30 Tage ------------------------------------
  // Der Gesamtzähler steht am Fahrzeug; diese Einträge tragen den Verlauf für
  // das Diagramm im Händler-Dashboard. Es wird nur ein Bruchteil erzeugt —
  // eine Zeile je Aufruf wären zehntausende ohne zusätzlichen Erkenntniswert.
  const viewRows: { vehicleId: string; createdAt: Date }[] = [];
  const dayMs = 86_400_000;

  for (const vehicle of vehicles) {
    const detail = await prisma.vehicle.findUnique({
      where: { id: vehicle.id },
      select: { viewCount: true },
    });

    const sample = Math.min(30, Math.round((detail?.viewCount ?? 0) * 0.12));

    for (let i = 0; i < sample; i += 1) {
      // Jüngere Tage bekommen mehr Aufrufe — so verläuft echtes Interesse.
      const daysAgo = Math.floor(Math.abs(random.next() - random.next()) * 30);
      viewRows.push({
        vehicleId: vehicle.id,
        createdAt: new Date(Date.now() - daysAgo * dayMs - random.int(0, 86_399) * 1000),
      });
    }
  }

  if (viewRows.length > 0) {
    await prisma.listingView.createMany({ data: viewRows });
  }

  log('Aufrufe (30 Tage)', viewRows.length);

  // --- Bewertungen ---------------------------------------------------------
  const dealerList = await prisma.dealer.findMany({ select: { id: true } });
  const REVIEW_BODIES = [
    'Shërbim korrekt dhe profesional. Vetura ishte saktësisht si në shpallje.',
    'Staf i sjellshëm, procedura shkoi shpejt dhe pa probleme.',
    'Çmim i drejtë dhe ndihmë e mirë me dokumentacionin. E rekomandoj.',
    'Vetura ishte në gjendje të mirë, por prita pak gjatë për regjistrimin.',
  ];

  for (const dealer of dealerList) {
    const raters = random.shuffle(users).slice(0, random.int(2, 7));
    for (const rater of raters) {
      const rating = random.weighted([
        { item: 5, weight: 52 }, { item: 4, weight: 30 },
        { item: 3, weight: 12 }, { item: 2, weight: 4 }, { item: 1, weight: 2 },
      ]);
      await prisma.review.create({
        data: {
          dealerId: dealer.id,
          authorId: rater.id,
          rating,
          body: random.pick(REVIEW_BODIES),
          verified: random.chance(0.6),
          createdAt: new Date(Date.now() - random.int(5, 500) * 86_400_000),
        },
      });
      reviews += 1;
    }

    // Durchschnitt am Haendler mitfuehren, damit die Suche nicht rechnen muss.
    const stats = await prisma.review.aggregate({
      where: { dealerId: dealer.id },
      _avg: { rating: true },
      _count: true,
    });
    await prisma.dealer.update({
      where: { id: dealer.id },
      data: {
        ratingAvg: Number((stats._avg.rating ?? 0).toFixed(2)),
        ratingCount: stats._count,
      },
    });
  }

  // --- Moderation: Prüffälle und Meldungen ---------------------------------
  // Ohne sie stünde der Verwaltungsbereich leer und liesse sich nicht beurteilen.
  const { assessListing } = await import('../features/listings/moderation.js');

  /**
   * Jeder Prüffall bekommt einen echten Mangel, und die Auffälligkeiten werden
   * daraus hergeleitet. Zufällig vergebene Markierungen sähen im
   * Verwaltungsbereich falsch aus — etwa "weniger als zwei Fotos" an einem
   * Inserat mit acht Bildern.
   */
  const defects: { label: string; changes: { priceCents?: number; description?: string } }[] = [
    { label: 'priceTooLow', changes: { priceCents: 30_000 } },
    { label: 'tooFewPhotos', changes: {} },
    {
      label: 'contactInDescription',
      changes: {
        description:
          'Shitet urgjent, gjendje shumë e mirë. Për informata telefononi 044 512 380 ose shkruani.',
      },
    },
    {
      label: 'suspiciousWording',
      changes: {
        description:
          'Vetura ndodhet jashtë vendit. Pagesa behet me Western Union para dorëzimit te adresa juaj.',
      },
    },
  ];

  const pending = random.shuffle(vehicles).slice(0, 6);

  for (const [index, vehicle] of pending.entries()) {
    const defect = defects[index % defects.length];

    // Für "zu wenige Fotos" werden die Bilder bis auf eines entfernt.
    if (defect.label === 'tooFewPhotos') {
      const images = await prisma.vehicleImage.findMany({
        where: { vehicleId: vehicle.id },
        select: { id: true },
        orderBy: { position: 'asc' },
      });
      await prisma.vehicleImage.deleteMany({
        where: { id: { in: images.slice(1).map((image) => image.id) } },
      });
    }

    const updated = await prisma.vehicle.update({
      where: { id: vehicle.id },
      data: { ...defect.changes, status: 'PENDING_REVIEW' },
      select: {
        priceCents: true, description: true,
        seller: { select: { createdAt: true } },
        _count: { select: { images: true } },
      },
    });

    const review = assessListing({
      priceCents: updated.priceCents,
      photoCount: updated._count.images,
      description: updated.description ?? '',
      accountAgeHours: (Date.now() - updated.seller.createdAt.getTime()) / 3_600_000,
      priceFloorCents: 50_000,
      sellerVerified: false,
    });

    await prisma.vehicle.update({
      where: { id: vehicle.id },
      data: { flaggedReason: review.signals.join(',') || defect.label },
    });
  }

  const REPORT_REASONS = [
    'FRAUD', 'WRONG_PRICE', 'FAKE_VEHICLE', 'DUPLICATE', 'ALREADY_SOLD', 'WRONG_INFO',
  ] as const;

  const REPORT_DETAILS: Record<string, string> = {
    FRAUD: 'Shitësi kërkon pagesë paraprake përpara se ta shoh veturën.',
    WRONG_PRICE: 'Çmimi në shpallje nuk përputhet me atë që thotë shitësi në telefon.',
    FAKE_VEHICLE: 'Fotot janë marrë nga një shpallje tjetër në internet.',
    DUPLICATE: 'E njëjta veturë është e publikuar edhe një herë tjetër.',
    ALREADY_SOLD: 'Shitësi konfirmoi se vetura është shitur javën e kaluar.',
    WRONG_INFO: 'Kilometrazhi i deklaruar nuk përputhet me librin e servisit.',
  };

  const reported = random.shuffle(vehicles).slice(0, 5);
  let reports = 0;

  for (const vehicle of reported) {
    const reason = random.pick(REPORT_REASONS);
    await prisma.report.create({
      data: {
        vehicleId: vehicle.id,
        reporterId: random.pick(users).id,
        reason,
        details: REPORT_DETAILS[reason],
        createdAt: new Date(Date.now() - random.int(0, 12) * 86_400_000),
      },
    });
    reports += 1;
  }

  log('Prüffälle / Meldungen', `${pending.length} / ${reports}`);

  log('Merkliste / Gespräche / Bewertungen', `${favorites} / ${conversations} / ${reviews}`);
}

/**
 * Zwei Betriebsarten.
 *
 * Ohne Argument entsteht die vollständige Entwicklungsumgebung: Katalog plus
 * erfundene Fahrzeuge, Autohäuser und deren Nachrichten.
 *
 * Mit `--catalog` nur der Katalog — Länder, Städte, Marken, Modelle,
 * Ausstattung, Pakete, Grundeinstellungen. Das sind keine erfundenen Angebote,
 * sondern Nachschlagewerke, die jede Installation braucht. Eine echte
 * Installation startet damit und ohne ein einziges Inserat.
 */
async function main() {
  const started = Date.now();
  const catalogOnly = process.argv.includes('--catalog');

  console.log(`\n  LEVIZ — ${catalogOnly ? 'Katalog' : 'Beispieldaten'}\n`);

  if (!catalogOnly) {
    // Erfundene Inserate gehören nicht in eine echte Datenbank, und der Seed
    // löscht vorher alles Vorhandene. Beides wäre im Betrieb ein Schaden.
    const permission = mayWriteDemoContent(process.env);
    if (!permission.allowed) {
      console.error(`\n  Abgebrochen.\n\n  ${permission.reason}\n`);
      process.exit(1);
    }
  }

  if (catalogOnly) {
    // Der Katalog wird angelegt, nicht abgeglichen: seedBrands und die
    // übrigen benutzen `create`. Deshalb ist dieser Weg für eine frische
    // Installation gedacht. Stehen schon Inserate darin, würde das Leeren des
    // Katalogs sie mitreissen — dann lieber abbrechen.
    const belegt = await countExistingContent();

    if (belegt.total > 0) {
      console.error(
        `\n  Abgebrochen. Die Datenbank enthält bereits Inhalte:\n` +
          `    Fahrzeuge:    ${belegt.vehicles}\n` +
          `    Autohäuser:   ${belegt.dealers}\n` +
          `    Zahlungen:    ${belegt.payments}\n\n` +
          '  "db:catalog" richtet eine frische Installation ein und würde den\n' +
          '  Katalog neu aufbauen, an dem diese Einträge hängen.\n\n' +
          '  Erfundene Inhalte vorher entfernen:\n' +
          '    npm run db:clear -- --ja\n',
      );
      process.exit(1);
    }

    await clearCatalog();
    log('Katalog geleert');
  } else {
    await clearDatabase();
    log('Datenbank geleert');
  }

  const { countryIds, cityIds } = await seedGeography();
  const { brandIds, modelIds } = await seedBrands();
  const featureIds = await seedFeatures();
  await seedPackages();
  await seedSettings();

  if (catalogOnly) {
    console.log(`\n  Fertig in ${((Date.now() - started) / 1000).toFixed(1)}s`);
    console.log('\n  Katalog steht. Inserate legen echte Nutzer selbst an.\n');
    return;
  }

  const { demoUsers, users } = await seedUsers(cityIds);
  const dealers = await seedDealers(cityIds, demoUsers);

  await seedVehicles(
    { brandIds, modelIds, cityIds, countryIds, featureIds },
    users,
    dealers,
    demoUsers,
  );
  await seedInteractions(users, demoUsers);

  console.log(`\n  Fertig in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  console.log('\n  Demo-Konten (nur Entwicklung), Passwort für alle: ' + DEMO_PASSWORD);
  console.log('    admin@leviz.dev    Verwaltung');
  console.log('    dealer@leviz.dev   Händler (Auto Krasniqi)');
  console.log('    seller@leviz.dev   Privatverkäufer');
  console.log('    buyer@leviz.dev    Käufer\n');
}

main()
  .catch((error) => {
    console.error('\n  Seed fehlgeschlagen:\n', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
