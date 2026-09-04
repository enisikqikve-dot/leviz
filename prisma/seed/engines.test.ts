import { describe, expect, it } from 'vitest';

import { BRANDS } from './brands';
import { enginesFor, ENGINES } from './engines';


/** Ermittelt die Motorengruppe der Marke, zu der das Modell gehoert. */
function styleFor(modelSlug: string): (typeof BRANDS)[number]['engineStyle'] {
  const brand = BRANDS.find((entry) =>
    entry.models.some((model) => model.slug === modelSlug),
  );
  if (!brand) throw new Error(`Modell unbekannt: ${modelSlug}`);
  return brand.engineStyle;
}

describe('Motorisierungen', () => {
  it('gibt einem BMW 5er keine 3er-Motorisierung', () => {
    const names = enginesFor('bmw', '5er').map((engine) => engine.name);
    expect(names).not.toContain('318d');
    expect(names).not.toContain('320d');
    expect(names).toContain('520d');
  });

  it('gibt einem BMW 1er keine 7er-Motorisierung', () => {
    const names = enginesFor('bmw', '1er').map((engine) => engine.name);
    expect(names).not.toContain('730d');
    expect(names).toContain('116d');
  });

  it('gibt einer Mercedes C-Klasse keine E-Klasse-Motorisierung', () => {
    const names = enginesFor('mercedes', 'c-klasse').map((engine) => engine.name);
    expect(names).not.toContain('E 220 d');
    expect(names).toContain('C 220 d');
  });

  it('laesst keine Volvo-Bezeichnung auf einen Land Rover', () => {
    const names = enginesFor('jlr', 'defender').map((engine) => engine.name);
    expect(names).not.toContain('D5');
    expect(names).not.toContain('T5');
    expect(names).toContain('2.0 SD4');
  });

  it('gibt einem Tesla nur den Elektroantrieb passender Modelle', () => {
    const names = enginesFor('ev', 'model-3').map((engine) => engine.name);
    expect(names).toContain('Long Range');
  });

  it('liefert fuer jedes Modell jeder Marke mindestens eine Motorisierung', () => {
    for (const brand of BRANDS) {
      for (const model of brand.models) {
        const options = enginesFor(brand.engineStyle, model.slug);
        expect(
          options.length,
          `${brand.slug}/${model.slug} hat keine Motorisierung`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it('haelt den Dieselanteil ueber der Haelfte', () => {
    const all = Object.values(ENGINES).flat();
    const diesel = all.filter((engine) => engine.fuel === 'DIESEL').length;
    expect(diesel / all.length).toBeGreaterThan(0.5);
  });
});

describe('Motorzuordnung der uebrigen Marken', () => {
  it('gibt einem Fiat Panda keinen Alfa-Motor', () => {
    const names = enginesFor('fiat', 'panda').map((engine) => engine.name);
    expect(names).not.toContain('2.2 JTDM');
    expect(names).not.toContain('1.9 JTD');
    expect(names).toContain('1.2 8V');
  });

  it('gibt einem Transporter keinen Kleinwagenmotor', () => {
    const names = enginesFor('fiat', 'ducato').map((engine) => engine.name);
    expect(names).not.toContain('1.2 8V');
    expect(names).toContain('2.3 Multijet');
  });

  it('macht aus einem Mitsubishi L200 keinen Hybrid', () => {
    const names = enginesFor('mitsubishi', 'l200').map((engine) => engine.name);
    expect(names).not.toContain('2.5 Hybrid AWD');
    expect(names).not.toContain('1.8 Hybrid');
  });

  it('laesst den Hybrid dort zu, wo es ihn gibt', () => {
    expect(enginesFor('toyota', 'rav4').map((engine) => engine.name)).toContain('2.5 Hybrid AWD');
  });

  it('steckt keinen V6 in einen VW Touran', () => {
    const names = enginesFor('vw', 'touran').map((engine) => engine.name);
    expect(names).not.toContain('3.0 TDI');
  });

  it('erlaubt den V6 im Touareg', () => {
    expect(enginesFor('vw', 'touareg').map((engine) => engine.name)).toContain('3.0 TDI');
  });
});

describe('Hubraum passend zur Karosserieform', () => {
  it('gibt einem Pickup keinen Kleinwagenmotor', () => {
    const engines = enginesFor('mitsubishi', 'l200', 'PICKUP');
    for (const engine of engines) {
      expect(engine.displacementCcm, engine.name).toBeGreaterThanOrEqual(1900);
    }
  });

  it('gibt einem Kleinbus keinen Kleinwagenmotor', () => {
    for (const engine of enginesFor('vw', 'transporter', 'MINIBUS')) {
      expect(engine.displacementCcm, engine.name).toBeGreaterThanOrEqual(1900);
    }
  });

  it('laesst Kleinwagen ihre kleinen Motoren behalten', () => {
    const names = enginesFor('fiat', 'panda', 'HATCHBACK').map((e) => e.name);
    expect(names).toContain('1.2 8V');
  });

  it('nimmt Elektroantriebe von der Hubraumregel aus', () => {
    const names = enginesFor('ev', 'model-y', 'SUV').map((e) => e.name);
    expect(names).toContain('Long Range');
  });

  it('liefert fuer jede Kombination aus Modell und Form mindestens einen Motor', () => {
    for (const brand of BRANDS) {
      for (const model of brand.models) {
        for (const bodyType of model.bodyTypes) {
          const options = enginesFor(brand.engineStyle, model.slug, bodyType);
          expect(
            options.length,
            `${brand.slug}/${model.slug}/${bodyType} hat keine Motorisierung`,
          ).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe('Markenzeichen bleiben bei ihrer Marke', () => {
  it('gibt einem Opel keinen Ford-Motor', () => {
    const names = enginesFor('opel', 'astra').map((e) => e.name);
    expect(names.some((name) => name.includes('TDCi'))).toBe(false);
    expect(names.some((name) => name.includes('CDTI'))).toBe(true);
  });

  it('gibt einem Toyota keine Mazda-Bezeichnung', () => {
    const names = enginesFor('toyota', 'corolla').map((e) => e.name);
    expect(names.some((name) => name.includes('SkyActiv'))).toBe(false);
    expect(names.some((name) => name.includes('D-4D') || name.includes('VVT-i') || name.includes('Hybrid'))).toBe(true);
  });

  it('gibt einem Kia keine Nissan-Bezeichnung', () => {
    const names = enginesFor('hyundai', 'rio').map((e) => e.name);
    expect(names.some((name) => name.includes('DIG-T'))).toBe(false);
    expect(names.some((name) => name.includes('CRDi') || name.includes('GDI'))).toBe(true);
  });

  it('gibt einem Citroën keine Renault-Bezeichnung', () => {
    const names = enginesFor('psa', 'c4').map((e) => e.name);
    expect(names.some((name) => name.includes('dCi'))).toBe(false);
    expect(names.some((name) => name.includes('HDi'))).toBe(true);
  });

  it('setzt kein quattro auf einen VW Polo', () => {
    const names = enginesFor('vw', 'polo').map((e) => e.name);
    expect(names.some((name) => name.includes('quattro'))).toBe(false);
  });

  it('kennt fuer jede Marke eine Motorengruppe mit Inhalt', () => {
    for (const brand of BRANDS) {
      expect(
        ENGINES[brand.engineStyle]?.length,
        `${brand.slug} hat keine Motorengruppe`,
      ).toBeGreaterThan(0);
    }
  });
});

describe('Oberklasse bekommt keine Kleinmotoren', () => {
  /** Modell, kleinster plausibler Hubraum in ccm. */
  const FLOORS: [string, number][] = [
    ['a8', 2500], ['a6', 1900], ['q7', 2500], ['touareg', 2500],
    ['panamera', 2900], ['cayenne', 2900], ['xc90', 1900],
    ['passat', 1300], ['superb', 1300], ['crafter', 1900],
  ];

  for (const [modelSlug, floor] of FLOORS) {
    it(`setzt in einen ${modelSlug} nichts unter ${floor} ccm`, () => {
      for (const engine of enginesFor(styleFor(modelSlug), modelSlug)) {
        // Elektromotoren haben keinen Hubraum und sind ausgenommen.
        if (engine.displacementCcm === 0) continue;
        expect(
          engine.displacementCcm,
          `${modelSlug}: ${engine.name}`,
        ).toBeGreaterThanOrEqual(floor);
      }
    });
  }

  it('laesst den kleinen Motor im Golf und im Polo zu', () => {
    const golf = enginesFor('vw', 'golf').map((e) => e.displacementCcm);
    expect(Math.min(...golf.filter((ccm) => ccm > 0))).toBeLessThan(1300);
  });
});

describe('Elektromodelle bekommen keinen Verbrenner', () => {
  for (const modelSlug of ['id-4', 'e-tron', 'i3']) {
    it(`gibt einem ${modelSlug} nur Elektroantrieb`, () => {
      const options = enginesFor(styleFor(modelSlug), modelSlug);
      expect(options.length).toBeGreaterThan(0);
      for (const engine of options) {
        expect(engine.fuel, `${modelSlug}: ${engine.name}`).toBe('ELECTRIC');
      }
    });
  }

  it('laesst den Verbrenner im Golf unangetastet', () => {
    const fuels = new Set(enginesFor('vw', 'golf').map((e) => e.fuel));
    expect(fuels.has('DIESEL')).toBe(true);
    expect(fuels.has('PETROL')).toBe(true);
  });
});

describe('Kleinwagen bekommen keine grossen Maschinen', () => {
  /** Modell, groesster plausibler Hubraum in ccm. */
  const CEILINGS: [string, number][] = [
    ['fabia', 1600], ['polo', 1600], ['corsa', 1600], ['panda', 1400],
    ['500', 1400], ['micra', 1500], ['yaris', 1500], ['clio', 1600],
  ];

  for (const [modelSlug, ceiling] of CEILINGS) {
    it(`setzt in einen ${modelSlug} nichts ueber ${ceiling} ccm`, () => {
      const options = enginesFor(styleFor(modelSlug), modelSlug);
      expect(options.length).toBeGreaterThan(0);
      for (const engine of options) {
        if (engine.displacementCcm === 0) continue;
        expect(
          engine.displacementCcm,
          `${modelSlug}: ${engine.name}`,
        ).toBeLessThanOrEqual(ceiling);
      }
    });
  }

  it('laesst der Mittelklasse die grossen Motoren', () => {
    const passat = enginesFor('vw', 'passat').map((e) => e.displacementCcm);
    expect(Math.max(...passat)).toBeGreaterThan(1900);
  });
});
