import { describe, expect, it } from 'vitest';

import { serializeJsonLd } from './json-ld';

describe('serializeJsonLd', () => {
  it('laesst kein </script> im Ergebnis stehen', () => {
    // Der Angriff: ein Inseratstext, der aus dem Skriptelement ausbricht.
    const boesartig = '</script><script>fetch("https://evil.tld")</script>';
    const output = serializeJsonLd({ description: boesartig });

    expect(output).not.toContain('</script>');
    expect(output).not.toContain('<');
    expect(output).toContain('\\u003c');
  });

  it('maskiert auch > und &', () => {
    const output = serializeJsonLd({ text: 'a > b & c' });

    expect(output).not.toContain('>');
    expect(output).not.toContain('&');
  });

  it('maskiert Zeilentrenner, die JavaScript umbrechen', () => {
    const output = serializeJsonLd({ text: 'a\u2028b\u2029c' });

    expect(output).not.toContain('\u2028');
    expect(output).not.toContain('\u2029');
  });

  it('veraendert die Daten nicht', () => {
    // Entscheidend: die Maskierung darf nur die Schreibweise aendern.
    // Suchmaschinen muessen denselben Inhalt lesen wie vorher.
    const data = {
      '@type': 'Car',
      name: 'BMW 320d <Sport> & mehr',
      description: '</script> Zoll: bezahlt',
      price: '15000.00',
      images: ['https://example.com/a.jpg?w=800&h=600'],
      nested: { value: 42, flag: true, missing: null },
    };

    expect(JSON.parse(serializeJsonLd(data))).toEqual(data);
  });

  it('bleibt bei harmlosen Daten gueltiges JSON', () => {
    const data = { '@context': 'https://schema.org', '@type': 'WebSite' };
    expect(JSON.parse(serializeJsonLd(data))).toEqual(data);
  });
});
