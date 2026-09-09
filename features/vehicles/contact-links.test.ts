import { describe, expect, it } from 'vitest';

import { viberLink, whatsappLink } from './contact-links';

describe('whatsappLink', () => {
  it('macht aus einer gespeicherten Nummer einen wa.me-Verweis', () => {
    expect(whatsappLink('+38344123456')).toBe('https://wa.me/38344123456');
  });

  it('wirft Leerzeichen und Bindestriche weg', () => {
    expect(whatsappLink('+383 44 123-456')).toBe('https://wa.me/38344123456');
  });

  it('haengt die vorgeschlagene Nachricht an', () => {
    expect(whatsappLink('+38344123456', 'A është ende në shitje?')).toBe(
      'https://wa.me/38344123456?text=A%20%C3%ABsht%C3%AB%20ende%20n%C3%AB%20shitje%3F',
    );
  });

  it('gibt ohne Nummer nichts zurueck', () => {
    expect(whatsappLink(null)).toBeNull();
    expect(whatsappLink(undefined)).toBeNull();
    expect(whatsappLink('')).toBeNull();
  });

  it('lehnt zu kurze Eingaben ab, statt einen kaputten Verweis zu bauen', () => {
    // Eine Durchwahl ohne Vorwahl fuehrt bei WhatsApp ins Nichts. Lieber kein
    // Knopf als einer, der beim Antippen eine Fehlermeldung zeigt.
    expect(whatsappLink('044123')).toBeNull();
  });
});

describe('viberLink', () => {
  it('behaelt das Plus, weil Viber es erwartet', () => {
    expect(viberLink('+38344123456')).toBe('viber://chat?number=%2B38344123456');
  });

  it('gibt ohne Nummer nichts zurueck', () => {
    expect(viberLink(null)).toBeNull();
  });
});
