/**
 * Führt den Browser zur Bezahlseite des Anbieters.
 *
 * Zwei Wege, weil Anbieter zwei Wege verlangen. Eine Sitzungsadresse wird
 * aufgerufen; eine gehostete Bankseite bekommt ein abgeschicktes Formular.
 * Betrag, Rückkehradressen und Prüfsumme gehören nicht in eine Adresszeile:
 * dort landen sie im Verlauf des Browsers, im Verweis-Kopf der nächsten Seite
 * und in den Protokollen jedes Servers dazwischen.
 */
export type CheckoutRedirect = {
  url: string;
  fields?: Record<string, string>;
};

/**
 * Baut das Formular, ohne es abzuschicken. Ausgelagert, damit sich der Aufbau
 * prüfen lässt — ein abgeschicktes Formular verlässt die Seite und ist danach
 * nicht mehr zu betrachten.
 */
export function buildCheckoutForm(
  document: Document,
  target: CheckoutRedirect & { fields: Record<string, string> },
): HTMLFormElement {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = target.url;
  // Die Seite wird ohnehin verlassen; sichtbar wäre das Formular nur als
  // kurzes Aufblitzen.
  form.hidden = true;

  for (const [name, value] of Object.entries(target.fields)) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.append(input);
  }

  return form;
}

/** Schickt den Browser zur Bezahlseite. Kehrt nicht zurück. */
export function goToCheckout(target: CheckoutRedirect): void {
  if (!target.fields || Object.keys(target.fields).length === 0) {
    window.location.href = target.url;
    return;
  }

  const form = buildCheckoutForm(document, { ...target, fields: target.fields });
  document.body.append(form);
  form.submit();
}
