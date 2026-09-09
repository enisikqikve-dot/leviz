/**
 * Verweise auf WhatsApp und Viber.
 *
 * Warum das hier steht statt im Formular: in Kosovo, Albanien und Nordmazedonien
 * laeuft der erste Kontakt fast immer ueber WhatsApp oder Viber. Ein
 * Kontaktformular auf der Seite bedeutet fuer den Kaeufer, in einer fremden
 * Oberflaeche zu schreiben und dann auf eine Antwort zu warten, die er nicht
 * sieht -- und fuer den Verkaeufer eine weitere Stelle, die er im Blick behalten
 * muesste. Beide greifen stattdessen zum Telefon.
 *
 * Die Nummern liegen in der Datenbank bereits international (+38344123456).
 */

/** WhatsApp erwartet die Nummer ohne Plus und ohne Trennzeichen. */
function nurZiffern(phone: string): string | null {
  const ziffern = phone.replace(/\D/g, '');
  // Kuerzer als eine Laendervorwahl plus Anschluss kann keine echte Nummer sein.
  return ziffern.length >= 8 ? ziffern : null;
}

/**
 * `wa.me` funktioniert ueberall: auf dem Telefon oeffnet es die App, am
 * Rechner WhatsApp Web. Ohne App landet der Besucher auf einer Seite, die das
 * erklaert -- nie im Leeren.
 */
export function whatsappLink(phone: string | null | undefined, text?: string): string | null {
  if (!phone) return null;
  const ziffern = nurZiffern(phone);
  if (!ziffern) return null;

  const frage = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/${ziffern}${frage}`;
}

/**
 * Viber hat keine Web-Entsprechung: `viber://` oeffnet die App, und ohne
 * installierte App passiert nichts. Deshalb steht der Knopf neben WhatsApp und
 * nicht an dessen Stelle.
 */
export function viberLink(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const ziffern = nurZiffern(phone);
  if (!ziffern) return null;

  return `viber://chat?number=${encodeURIComponent(`+${ziffern}`)}`;
}
