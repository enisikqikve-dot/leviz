# LEVIZ

**Gjej. Krahaso. Lëviz.** — Finden. Vergleichen. Fahren.

Unabhängiger Fahrzeugmarktplatz für den Kosovo, Albanien und die weitere Region.
Kaufen und verkaufen von PKW, Nutzfahrzeugen, Motorrädern und Wohnmobilen.

Der Name ist Programm: **„lëviz"** heißt auf Albanisch „bewege dich / fahr".

---

## Was LEVIZ anders macht

Der Fahrzeughandel im Kosovo und in Albanien läuft anders als in Westeuropa —
ein großer Teil der Fahrzeuge ist importiert. Deshalb sind diese Angaben bei
LEVIZ echte Datenfelder, Filter und Abzeichen statt Fließtext in der Beschreibung:

| Feld | Bedeutung |
|---|---|
| **Zollstatus** | `i doganuar` / `i padoganuar` — verzollt oder nicht |
| **Kennzeichen-Herkunft** | RKS · AL · MK · ausländisch |
| **Importland** | Deutschland, Schweiz, Italien, Österreich … |
| **Registrierung gültig bis** | `regjistrimi deri` |
| **Lenkung** | links / rechts |

---

## Technischer Aufbau

| Bereich | Wahl |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) · React 19 |
| Sprache | TypeScript im Strict-Modus |
| Oberfläche | Tailwind CSS v4 · shadcn/ui · lucide-react |
| Datenbank | PostgreSQL 17 · Prisma 7 |
| Anmeldung | Auth.js v5 — E-Mail+Passwort, Telefon+SMS, GitHub |
| Mehrsprachigkeit | next-intl — Albanisch (Standard), Deutsch, Englisch |
| Validierung | Zod 4 · React Hook Form |
| Tests | Vitest · Playwright |

### Verzeichnisse

```
app/[locale]/        Seiten, nach Sprache gruppiert
components/ui/       shadcn-Grundbausteine
components/leviz/    Markenkomponenten (Logo, Kopf, Fuß, Umschalter)
features/<domain>/   Geschäftslogik: Server Actions, Zod-Schemas, Abfragen
lib/                 Infrastruktur hinter Interfaces (siehe unten)
messages/            Übersetzungen je Sprache
prisma/              Schema, Migrationen, Seed
```

Geschäftslogik liegt niemals in UI-Komponenten.

### Austauschbare Dienste

Jeder externe Dienst sitzt hinter einem Interface mit funktionierender
Mock-Implementierung. **Die Anwendung ist ohne einen einzigen API-Schlüssel
vollständig benutzbar** — echte Anbieter werden später nur eingehängt.

| Modul | Produktiv | Ohne Schlüssel |
|---|---|---|
| `lib/ai` | OpenAI | nachvollziehbare Beispieltexte |
| `lib/payments` | Stripe | Mock-Buchungen ohne Geldfluss |
| `lib/email` | Resend / SMTP | Ausgabe im Terminal |
| `lib/sms` | Twilio | Einmalcode im Terminal |
| `lib/storage` | S3 / Cloudflare R2 | lokal unter `public/uploads` |
| `lib/geo` | Mapbox | Koordinaten aus der Städtetabelle |
| `lib/search` | OpenSearch | PostgreSQL-Volltext |

---

## Mehrsprachigkeit

Albanisch ist Standard und läuft **ohne Präfix**. Jede Route hat pro Sprache
einen eigenen, suchmaschinenfreundlichen Pfad:

| Seite | Albanisch | Deutsch | Englisch |
|---|---|---|---|
| Suche | `/kerko` | `/de/suche` | `/en/search` |
| Fahrzeug | `/vetura/[slug]` | `/de/fahrzeug/[slug]` | `/en/vehicle/[slug]` |
| Verkaufen | `/shit/krijo` | `/de/verkaufen/erstellen` | `/en/sell/create` |
| Merkliste | `/te-preferuarat` | `/de/merkliste` | `/en/favorites` |

Die Zuordnung steht vollständig in [`lib/i18n/routing.ts`](lib/i18n/routing.ts).
Ein Test wacht darüber, dass alle drei Kataloge dieselben Schlüssel haben und
kein Text leer bleibt.

## Währungen

Preise werden **ausschließlich in Euro-Cent** gespeichert (`priceCents`). Der
Lek-Betrag entsteht erst bei der Anzeige über einen Kurs, der später im Admin
änderbar ist — es gibt nie zwei Wahrheiten. Siehe [`lib/currency.ts`](lib/currency.ts).

---

## Beispieldaten

Der Seed-Lauf erzeugt reproduzierbar (fester Zufallswert) einen Bestand, der
dem Markt in Kosovo und Albanien entspricht:

| | |
|---|---|
| Fahrzeuge | 242, Median 9.400 €, Ø 191.000 km |
| Kraftstoff | 62 % Diesel, 27 % Benzin |
| Zoll | 75 % verzollt, 18 % unverzollt |
| Marken | 35 mit 181 Modellen, deutsche Marken 42 % |
| Händler | 20, davon 18 verifiziert |
| Nutzer | 54 inklusive vier Demo-Konten |

**Demo-Konten** (nur Entwicklung), Passwort für alle `Leviz2026!`:
`admin@leviz.dev` · `dealer@leviz.dev` · `seller@leviz.dev` · `buyer@leviz.dev`

> Die Fahrzeugfotos sind frei lizenzierte Stockaufnahmen von Unsplash und
> zeigen nicht das jeweilige Modell. Der frei verfügbare Bestand enthält kaum
> Alltagsfahrzeuge, deshalb wird nur dort nach Karosserieform zugeordnet, wo
> genug Aufnahmen vorliegen — siehe `prisma/seed/photos.ts`.

---

## Einrichtung

Voraussetzung: **Node.js 20+**. Eine eigene PostgreSQL-Installation ist *nicht*
nötig — LEVIZ bringt für die Entwicklung ein natives PostgreSQL 18 mit.

```bash
npm install
cp .env.example .env
npm run db:init
npm run db:migrate
npm run db:seed
npm run dev
```

Die Anwendung läuft auf http://localhost:3000

### Zur Datenbank

`npm run db:init` legt einmalig einen PostgreSQL-Cluster unter `.postgres/data`
an und startet ihn auf Port **5433**. Danach genügt `npm run db:start`.

Der Grund für die mitgelieferte Instanz: Sie ist reproduzierbar, braucht keine
Administratorrechte und kollidiert nicht mit einem bereits installierten
PostgreSQL auf Port 5432.

**Auf eine andere Datenbank wechseln** — etwa deine eigene Installation oder
einen Server — ist eine einzige Zeile in `.env`:

```
DATABASE_URL="postgresql://benutzer:passwort@host:5432/leviz?schema=public"
```

Danach `npm run db:migrate` und `npm run db:seed`. Die Skripte `db:init`,
`db:start` und `db:stop` werden dann nicht mehr gebraucht.

### Anmelde-Geheimnis

`.env.example` enthält kein Geheimnis. Erzeuge eines mit:

```bash
npx auth secret
```

### Ohne Zugangsschlüssel arbeiten

E-Mails und SMS werden ins Terminal geschrieben, solange `EMAIL_DRIVER` und
`SMS_DRIVER` auf `console` stehen. Registrierung, Passwort-Zurücksetzung und
die Anmeldung per Telefonnummer lassen sich damit vollständig durchspielen —
der Einmalcode steht im Terminal des Entwicklungsservers.

---

## Befehle

| Befehl | Zweck |
|---|---|
| `npm run dev` | Entwicklungsserver |
| `npm run build` | Produktionsbuild |
| `npm start` | Produktionsserver |
| `npm run typecheck` | TypeScript prüfen |
| `npm run lint` | ESLint |
| `npm test` | Tests einmalig |
| `npm run test:watch` | Tests fortlaufend |
| `npm run db:init` | PostgreSQL-Cluster einmalig anlegen und starten |
| `npm run db:start` | Lokale Datenbank starten |
| `npm run db:stop` | Lokale Datenbank stoppen |
| `npm run db:status` | Läuft die Datenbank? |
| `npm run db:migrate` | Migration erzeugen und anwenden |
| `npm run db:seed` | Beispieldaten einspielen |
| `npm run db:studio` | Prisma Studio öffnen |
| `npm run db:reset` | Datenbank zurücksetzen und neu befüllen |
| `npm run brand:avatar` | Profilbilder für soziale Netzwerke erzeugen |
| `npm run brand:social` | Beitragsbilder für soziale Netzwerke erzeugen |

---

## Umgebungsvariablen

Vollständige Liste mit Erklärungen in [`.env.example`](.env.example).
Nur `DATABASE_URL` und `AUTH_SECRET` sind zwingend — alles andere hat
funktionierende Standardwerte für die Entwicklung.

> `.env` ist über `.gitignore` ausgeschlossen. Echte Zugangsdaten gehören
> niemals ins Repository.

---

## Bild-Uploads

Hochgeladene Bilder werden **am Inhalt geprüft, nicht an der Dateiendung**.
Ein umbenanntes Programm meldet der Browser als `image/jpeg`; erst die ersten
Bytes verraten den echten Typ. Erlaubt sind JPG, PNG, WebP und AVIF, je bis
8 MB. HEIC vom iPhone wird gesondert erkannt und mit einem verständlichen
Hinweis abgelehnt, statt einfach als "ungültig" zu gelten.

Vor dem Hochladen verkleinert der Browser jedes Foto auf 1920 Pixel Kantenlänge
und komprimiert es — Handyfotos haben oft mehrere Megabyte, und über eine
Mobilfunkverbindung entstehen daraus abgebrochene Uploads.

Der Speicher liegt hinter einem Interface (`lib/storage`). In der Entwicklung
schreibt er nach `public/uploads`; für den Betrieb wird dort ein S3- oder
R2-Anbieter eingehängt, ohne dass sich für die Aufrufer etwas ändert.

---

## Moderation

Neue Inserate erscheinen **sofort**. Nur auffällige gehen vorher zur Prüfung —
die Regeln stehen in `features/listings/moderation.ts`:

- Preis unter der im Verwaltungsbereich gesetzten Untergrenze
- weniger als zwei Fotos
- Telefonnummer oder E-Mail im Beschreibungstext
- in der Region typische Betrugsformulierungen
- erstes Inserat eines Kontos, das jünger als 24 Stunden ist

Geprüfte Händler sind ausgenommen; ihre Auffälligkeiten werden trotzdem
festgehalten.

---

## Verwaltungsbereich

Erreichbar unter `/admin`, ausschließlich für `ADMIN` und `SUPER_ADMIN`.
Die Pfade bleiben in allen Sprachen englisch, damit sich eingespielte Abläufe
nicht mit der Sprachwahl verschieben.

| Seite | Was sie kann |
|---|---|
| Überblick | Kennzahlen, offene Prüfungen und Meldungen als Handlungsaufforderung |
| Fahrzeuge | Prüfliste mit Auffälligkeiten, Freigabe und Ablehnung |
| Meldungen | Meldung verwerfen, Inserat verbergen, Inserat löschen |
| Händler | Prüfsiegel vergeben und entziehen |
| Nutzer | Suche, Sperren und Entsperren |
| Marken | Bestand je Marke, Kennzeichnung als beliebt |
| Einstellungen | Wechselkurs, Laufzeit, Preisuntergrenze, Trefferzahl, Umkreis |

### Autorisierung entscheidet die Datenbank

Rolle und Sperrstatus stehen zwar im Sitzungstoken, werden dort aber nur beim
Anmelden gesetzt. Ein bereits ausgestelltes Token behielte seine Rechte sonst
bis zum Ablauf — eine Sperrung bliebe folgenlos, und ein gelöschtes Konto liefe
beim Schreiben in einen Fremdschlüsselfehler. `getSessionUser` in
`lib/auth/guards.ts` schlägt das Konto deshalb bei jeder geschützten Anfrage
nach; `cache` aus React bündelt das auf eine Abfrage je Anfrage.

---

## Diagramme ohne Bibliothek

Das Verlaufsdiagramm im Händler-Dashboard ist reines SVG
(`features/dealers/components/views-chart.tsx`). Eine einzelne Zeitreihe
rechtfertigt keine zusätzliche Abhängigkeit, und so folgen die Farben ohne
Umweg den Design-Tokens — auch im Dunkelmodus.

Tage ohne Aufrufe erscheinen als Null statt zu fehlen. Sonst zöge das Diagramm
eine Linie über die Lücke und suggerierte einen Verlauf, den es nicht gab.

---

## Zahlenformate

Preise, Kilometerstände und Leistungsangaben werden in
`lib/currency.ts` **selbst formatiert**, nicht über `Intl`.

Der Grund: Node und Chrome bringen unterschiedliche ICU-Stände mit. Für
`sq-AL` liefert Node `29 990 €`, Chrome `€29,990` — und vierstellige Beträge
bleiben in beiden ungruppiert (`5500 €`). Auf einem Fahrzeugmarktplatz ist der
Preis die wichtigste Zahl der Seite; sie muss serverseitig und im Browser
identisch aussehen.

| Sprache | Preis | Kilometer |
|---|---|---|
| Albanisch | `29.990 €` | `185.000 km` |
| Deutsch | `29.990 €` | `185.000 km` |
| Englisch | `€29,990` | `185,000 km` |

---

## Barrierefreiheit und Darstellung

Hell mit dunklem Kopfbereich, Dunkelmodus von Anfang an mitgebaut und über die
Kopfzeile umschaltbar. Farbtokens liegen in [`app/globals.css`](app/globals.css).
Die Kontraste im Suchformular sind gemessen: Eingabetext 18,45:1,
Beschriftungen 5,76:1 — beide über der WCAG-AA-Schwelle.

---

## Stand der Umsetzung

- [x] **Phase 0** — Fundament, Marke, Mehrsprachigkeit, Design-System, Dunkelmodus
- [x] **Phase 1** — Datenbankschema, Migrationen, Anmeldung, Rollen
- [x] **Phase 2** — Marken, Modelle, Standorte, Beispieldaten
- [x] **Phase 3** — Suche mit Filtern, Sortierung, Umkreis
- [x] **Phase 4** — Fahrzeug-Detailseite
- [x] **Phase 5** — Inserat-Assistent mit Bild-Upload
- [x] **Phase 6** — Merkliste, Suchaufträge, Nachrichten, Vergleich
- [x] **Phase 7** — Händlerprofile und Händler-Dashboard
- [x] **Phase 8** — Verwaltungsbereich
- [ ] **Phase 9** — Pakete und Zahlungen
- [ ] **Phase 10** — KI-Funktionen
- [ ] **Phase 11** — SEO, Geschwindigkeit, Sicherheit, End-zu-End-Tests
