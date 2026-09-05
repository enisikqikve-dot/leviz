/**
 * Serialisiert strukturierte Daten fuer ein <script type="application/ld+json">.
 *
 * JSON.stringify allein reicht dafuer nicht. Es maskiert Anfuehrungszeichen
 * und Backslashes, aber nicht das Zeichen `<`. Steht in einem Inseratstext
 * `</script>`, endet das Skriptelement genau dort — alles danach liest der
 * Browser als HTML. Ein Verkaeufer koennte so beliebiges JavaScript auf seiner
 * eigenen Fahrzeugseite ausfuehren lassen, bei jedem Besucher und beim
 * Moderator, der das Inserat prueft.
 *
 * Die Ersetzungen liegen ausnahmslos innerhalb von JSON-Zeichenketten — `<`,
 * `>` und `&` kommen in der JSON-Struktur selbst nicht vor. `\u003c` ist eine
 * gueltige JSON-Maskierung und wird beim Einlesen wieder zu `<`, die Daten
 * bleiben also unveraendert.
 *
 * U+2028 und U+2029 sind in JSON erlaubt, beenden in JavaScript aber eine
 * Zeile; sie mitzunehmen kostet nichts und erspart eine Fehlersuche.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029');
}
