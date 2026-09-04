import { describe, expect, it } from 'vitest';

import type { BodyType } from '@/lib/generated/prisma/enums';

import { galleryFor, PHOTO_COUNT, SPORT_PHOTO_IDS } from './photos';

/** Kennung aus einer Unsplash-Adresse. */
const idOf = (url: string) => url.match(/photo-([\w-]+)\?/)?.[1] ?? '';

describe('Fotostrecken', () => {
  it('hat einen Bestand ohne Dubletten', () => {
    expect(PHOTO_COUNT).toBeGreaterThan(30);
  });

  it('liefert die gewuenschte Anzahl Bilder', () => {
    expect(galleryFor(0, 6, 'SEDAN')).toHaveLength(6);
    expect(galleryFor(3, 4, 'SUV')).toHaveLength(4);
  });

  it('zeigt innerhalb einer Strecke kein Bild doppelt', () => {
    for (let offset = 0; offset < 40; offset += 1) {
      const gallery = galleryFor(offset, 5, 'SEDAN');
      expect(new Set(gallery).size, `Strecke ${offset} wiederholt ein Bild`).toBe(5);
    }
  });

  it('nutzt fuer verschiedene Inserate verschiedene Titelbilder', () => {
    const first = new Set(
      Array.from({ length: 10 }, (_, i) => idOf(galleryFor(i, 1, 'SEDAN')[0])),
    );
    expect(first.size).toBeGreaterThan(4);
  });

  it('schoepft fuer Limousinen aus dem Alltagsbestand', () => {
    // Nach der Sichtkontrolle blieben vier echte Limousinen uebrig. Das traegt
    // die Gruppe nicht mehr allein, also greift der gemeinsame Alltagsbestand.
    const sedan = new Set(
      Array.from({ length: 40 }, (_, i) => idOf(galleryFor(i, 1, 'SEDAN')[0])),
    );
    expect(sedan.size).toBeGreaterThan(3);
    expect(sedan.size).toBeLessThanOrEqual(16);
  });

  it('greift bei zu kleinen Gruppen auf den ganzen Bestand zurueck', () => {
    // Fuer SUV gibt es zu wenige freie Aufnahmen. Lieber Vielfalt als
    // Dutzende Inserate mit demselben Bild.
    const suv = new Set(
      Array.from({ length: 60 }, (_, i) => idOf(galleryFor(i, 1, 'SUV')[0])),
    );
    expect(suv.size).toBeGreaterThan(8);
  });

  it('baut gueltige Bildadressen ohne Gesichtszuschnitt', () => {
    for (const url of galleryFor(7, 6, 'SUV')) {
      expect(url).toMatch(/^https:\/\/images\.unsplash\.com\/photo-/);
      expect(url).toContain('auto=format');
      expect(url).not.toContain('faces');
    }
  });

  it('kommt auch ohne Karosserieform zurecht', () => {
    expect(galleryFor(2, 3, null)).toHaveLength(3);
  });
});

describe('Alltagsfahrzeuge bekommen keine Sportwagenbilder', () => {
  const EVERYDAY: BodyType[] = [
    'HATCHBACK', 'SEDAN', 'ESTATE', 'SUV', 'PICKUP',
    'VAN', 'MINIBUS', 'TRUCK', 'CHASSIS', 'OTHER',
  ];

  for (const bodyType of EVERYDAY) {
    it(`zeigt an einem ${bodyType} keinen Sportwagen`, () => {
      for (let offset = 0; offset < 60; offset += 1) {
        for (const photo of galleryFor(offset, 8, bodyType)) {
          const sport = SPORT_PHOTO_IDS.find((id) => photo.includes(id));
          expect(sport, `${bodyType} bekam Sportwagenbild ${sport}`).toBeUndefined();
        }
      }
    });
  }

  it('behaelt die Sportwagenbilder fuer Coupé und Cabrio', () => {
    const photos = [
      ...galleryFor(0, 8, 'COUPE'),
      ...galleryFor(1, 8, 'CONVERTIBLE'),
    ];
    expect(photos.some((photo) => SPORT_PHOTO_IDS.some((id) => photo.includes(id)))).toBe(true);
  });
});

describe('Hauptbild', () => {
  const ATMOSPHERE = ['1609521263047-f8f205293f24', '1617195737496-bc30194e3a19'];

  it('zeigt nie ein Stimmungsbild ohne Fahrzeug', () => {
    const bodyTypes: BodyType[] = [
      'HATCHBACK', 'SEDAN', 'ESTATE', 'SUV', 'PICKUP', 'COUPE',
      'CONVERTIBLE', 'VAN', 'MINIBUS', 'TRUCK', 'CHASSIS', 'OTHER',
    ];
    for (const bodyType of bodyTypes) {
      for (let offset = 0; offset < 60; offset += 1) {
        const lead = galleryFor(offset, 6, bodyType)[0];
        for (const id of ATMOSPHERE) {
          expect(lead.includes(id), `${bodyType}/${offset}: ${lead}`).toBe(false);
        }
      }
    }
  });
});
