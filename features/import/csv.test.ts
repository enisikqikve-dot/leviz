import { describe, expect, it } from 'vitest';

import { detectDelimiter, parseCsv } from './csv';

describe('detectDelimiter', () => {
  it('erkennt das Semikolon aus einem europaeischen Excel', () => {
    expect(detectDelimiter('marka;modeli;viti')).toBe(';');
  });

  it('erkennt das Komma', () => {
    expect(detectDelimiter('brand,model,year')).toBe(',');
  });

  it('erkennt den Tabulator', () => {
    expect(detectDelimiter('brand\tmodel\tyear')).toBe('\t');
  });

  it('zaehlt Trennzeichen innerhalb von Anfuehrungszeichen nicht mit', () => {
    // Sonst gewinnt hier das Komma, obwohl die Datei Semikolon benutzt.
    expect(detectDelimiter('"Mercedes-Benz, C-Klasse";modeli;viti')).toBe(';');
  });
});

describe('parseCsv', () => {
  it('liest Kopfzeile und Zeilen', () => {
    const tabelle = parseCsv('marka;modeli\nBMW;320d\nAudi;A4');

    expect(tabelle.header).toEqual(['marka', 'modeli']);
    expect(tabelle.rows).toHaveLength(2);
    expect(tabelle.rows[0]?.cells).toEqual(['BMW', '320d']);
  });

  it('zaehlt Zeilen so, wie sie in Excel stehen', () => {
    // Der Haendler sucht den Fehler in seiner Datei, nicht in unserem Feld.
    const tabelle = parseCsv('marka\nBMW\nAudi');

    expect(tabelle.rows[0]?.line).toBe(2);
    expect(tabelle.rows[1]?.line).toBe(3);
  });

  it('wirft die Byte-Reihenfolge-Markierung von Excel weg', () => {
    const tabelle = parseCsv('﻿marka;modeli\nBMW;320d');
    expect(tabelle.header[0]).toBe('marka');
  });

  it('kommt mit Windows-Zeilenenden zurecht', () => {
    const tabelle = parseCsv('marka;modeli\r\nBMW;320d\r\n');

    expect(tabelle.rows).toHaveLength(1);
    expect(tabelle.rows[0]?.cells).toEqual(['BMW', '320d']);
  });

  it('haelt Trennzeichen innerhalb von Anfuehrungszeichen zusammen', () => {
    const tabelle = parseCsv('marka;pershkrimi\nBMW;"Serviset e bera; garanci"');

    expect(tabelle.rows[0]?.cells).toEqual(['BMW', 'Serviset e bera; garanci']);
  });

  it('versteht doppelte Anfuehrungszeichen als eines', () => {
    const tabelle = parseCsv('pershkrimi\n"Gomat ""si te reja"""');

    expect(tabelle.rows[0]?.cells).toEqual(['Gomat "si te reja"']);
  });

  it('haelt Zeilenumbrueche innerhalb eines Feldes zusammen', () => {
    // Eine mehrzeilige Beschreibung ist in Excel voellig normal.
    const tabelle = parseCsv('marka;pershkrimi\nBMW;"Rreshti i pare\nRreshti i dyte"');

    expect(tabelle.rows).toHaveLength(1);
    expect(tabelle.rows[0]?.cells[1]).toBe('Rreshti i pare\nRreshti i dyte');
  });

  it('ueberspringt leere Zeilen am Dateiende', () => {
    const tabelle = parseCsv('marka;modeli\nBMW;320d\n\n;\n');

    expect(tabelle.rows).toHaveLength(1);
  });

  it('gibt bei leerem Text nichts zurueck, statt zu scheitern', () => {
    const tabelle = parseCsv('');

    expect(tabelle.header).toEqual([]);
    expect(tabelle.rows).toEqual([]);
  });
});
