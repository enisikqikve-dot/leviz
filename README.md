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
| `lib/ai` | Sprachmodell | rechnet und formuliert selbst (siehe unten) |
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

> **Diese Daten sind erfunden.** Die 242 Fahrzeuge, 20 Autohäuser und 74
> Nutzer stammen aus dem Seed und existieren nicht. Sie gehören in die
> Entwicklung, nie in eine erreichbare Installation — sonst sehen Besucher
> Angebote, die niemand verkauft, und Händler, die niemand anrufen kann.
> Deshalb bricht `db:seed` ab, wenn `DATABASE_URL` nicht auf den eigenen
> Rechner zeigt, und eine echte Installation startet mit `db:catalog` und
> ohne ein einziges Inserat.

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

### Supabase

Für den gemeinsamen Stand liegt ein Supabase-Projekt bereit:

| | |
|---|---|
| Projekt | `leviz` |
| Kennung | `xupfqllspnlvuiakaatk` |
| Region | eu-central-1 (Frankfurt) |
| Schema | alle 34 Tabellen, 83 Indizes und 51 Fremdschlüssel sind eingespielt |

Das Datenbankpasswort steht ausschließlich im Dashboard unter
**Project Settings → Database → Connection string**. Ist es nicht mehr bekannt,
setzt **Reset database password** ein neues.

Zum Anbinden in `.env` die **direkte** Verbindung eintragen:

```
DATABASE_URL="postgresql://postgres.xupfqllspnlvuiakaatk:PASSWORT@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"
```

Danach `npm run db:seed`. Für den Betrieb später die gepoolte Verbindung auf
Port **6543** mit `?pgbouncer=true` — der Seed braucht aber Port 5432, weil der
Pooler keine Transaktion über mehrere Anweisungen halten kann.

**Zeilenschutz (RLS) ist bewusst noch aus.** LEVIZ spricht über Prisma und die
Postgres-Rolle mit der Datenbank, nicht über die Supabase-Bibliotheken mit dem
öffentlichen Schlüssel. Solange dieser Schlüssel nirgends veröffentlicht wird,
ist nichts offen. Sobald das Projekt öffentlich erreichbar ist, gehört RLS
eingeschaltet: ohne Regeln sperrt es `anon` und `authenticated` vollständig
aus, während Prisma als Eigentümer der Tabellen weiterarbeitet.

### Anmelde-Geheimnis

`.env.example` enthält kein Geheimnis. Erzeuge eines mit:

```bash
npx auth secret
```

### Anmeldung über GitHub

Der Knopf „Mit GitHub anmelden" erscheint nur, wenn beide Werte gesetzt sind —
ohne sie wird der Anbieter überall ausgeblendet, auch serverseitig.

1. https://github.com/settings/developers → **OAuth Apps** → **New OAuth App**
2. Ausfüllen:

   | Feld | Wert |
   |---|---|
   | Application name | `LEVIZ` |
   | Homepage URL | `http://localhost:3000` |
   | Authorization callback URL | `http://localhost:3000/api/auth/callback/github` |

3. **Generate a new client secret**, dann beides in die `.env`:

   ```
   AUTH_GITHUB_ID="Ov23li..."
   AUTH_GITHUB_SECRET="..."
   ```

4. Entwicklungsserver neu starten — Umgebungsvariablen werden nur beim Start
   gelesen.

Für die Produktion braucht es eine zweite OAuth-App mit der echten Domäne; eine
App kann nur eine Callback-Adresse führen.

**Konten werden nicht automatisch verschmolzen.** Wer sich mit E-Mail und
Passwort registriert hat und später den GitHub-Knopf drückt, bekommt eine
Erklärung statt einer Anmeldung. Auth.js böte dafür
`allowDangerousEmailAccountLinking`, doch die Option setzt voraus, dass die
Adresse des bestehenden Kontos bestätigt ist — bei LEVIZ ist sie das nicht.
Sonst könnte sich jemand mit einer fremden Adresse registrieren und käme an
das Konto, sobald deren echter Inhaber sich über GitHub anmeldet. Sobald die
Registrierung die Adresse bestätigt, lässt sich das gefahrlos umstellen.

### Ohne Zugangsschlüssel arbeiten

E-Mails und SMS werden ins Terminal geschrieben, solange `EMAIL_DRIVER` und
`SMS_DRIVER` auf `console` stehen. Registrierung, Passwort-Zurücksetzung und
die Anmeldung per Telefonnummer lassen sich damit vollständig durchspielen —
der Einmalcode steht im Terminal des Entwicklungsservers.

---

## Passwort vergessen: die Mail wirklich verschicken

Der Ablauf steht vollständig: Formular unter `/harrova-fjalekalimin`, ein Token
mit einer Stunde Gültigkeit in `PasswordResetToken`, die Zurücksetzungsseite und
die Mail in drei Sprachen. Was fehlt, ist nur der Versandweg.

**Mit `EMAIL_DRIVER="console"` funktioniert die Zurücksetzung nur scheinbar.**
Der Link landet im Protokoll des Servers statt im Postfach des Nutzers. Wer
sein Passwort vergisst, kommt nicht zurück — und im Fehlerprotokoll steht
nichts, weil technisch nichts schiefging.

### Einrichten mit dem eigenen Postfach

Am besten dem der eigenen Domäne: SPF und DKIM zeigen bereits dorthin, die Mail
landet also im Posteingang statt im Spam. Ein fremder Versender müsste dafür
erst freigeschaltet werden.

| Variable | Bei Hostinger |
|---|---|
| `EMAIL_DRIVER` | `smtp` |
| `SMTP_HOST` | `smtp.hostinger.com` |
| `SMTP_PORT` | `465` (leer lassen genügt) |
| `SMTP_USER` | die volle Adresse, z. B. `info@levizz.com` |
| `SMTP_PASSWORD` | das Passwort **des Postfachs** |
| `EMAIL_FROM` | `LEVIZ <info@levizz.com>` |

Port 465 verschlüsselt ab dem ersten Byte, Port 587 erst nach STARTTLS — der
Code leitet das aus dem Port ab, mehr ist nicht einzustellen.

**Der Absender muss zum Postfach passen.** Ein `EMAIL_FROM`, das auf eine
fremde Domäne zeigt, wird vom Mailserver abgelehnt oder landet im Spam.

### Halb eingerichtet ist schlimmer als gar nicht

`EMAIL_DRIVER="smtp"` ohne vollständige Zugangsdaten lässt die Anwendung mit
einer Meldung abbrechen, die den fehlenden Namen nennt. Der bequeme Weg wäre,
still auf das Terminal zurückzufallen — dann liefe der Betrieb scheinbar
normal, und niemand bekäme je eine Mail.

Steht der Weg auf `console`, schreibt die Anwendung im Betrieb eine Warnung
ins Protokoll. Das ist dort fast immer ein Versehen, und von aussen sieht man
es nicht: die Seite antwortet mit Absicht immer gleich, egal ob es die Adresse
gibt — sonst liesse sich darüber herausfinden, wer registriert ist.

### Nachsehen, ob der Versand wirklich läuft

```bash
cd ~/leviz && docker compose run --rm migrate npx tsx scripts/email-test.ts deine@adresse.tld
```

Das Skript nennt den eingerichteten Weg, Server und Postfach, verschickt eine
Testmail und sagt beim Fehlschlag, woran es lag — falsches Passwort, fehlendes
Postfach, gesperrter Port. „Die Mail kommt nicht an" hat vier mögliche
Ursachen, und ohne dieses Skript bleibt nur Raten.

Lokal genügt `npm run email:test -- deine@adresse.tld`.

---

## Ausweisprüfung

Händler müssen sich ausweisen, Privatverkäufer dürfen es. Beide bekommen
danach dasselbe Abzeichen an ihren Anzeigen; ohne Prüfung fehlt nur das
Abzeichen, inserieren darf jeder.

| Beleg | Person | Händler |
|---|---|---|
| Ausweis, Vorder- und Rückseite | Pflicht | Pflicht |
| Registerauszug mit Betriebsnummer | — | Pflicht |
| Adressnachweis | — | Pflicht |

Der Antrag läuft über `/paneli/verifikimi` (`/de/konto/verifizierung`), die
Entscheidung über `/admin/verifications`. Eine Ablehnung verlangt eine
Begründung — sonst steht der Antragsteller vor einem „nein" ohne Anhaltspunkt
und lädt dieselben Bilder noch einmal hoch.

### Wo die Belege liegen

**Nicht** bei den Fahrzeugfotos. Was unter `public/` liegt, ist mit der blossen
Adresse abrufbar; bei einem Foto ist das der Zweck, bei einem Ausweis der
Schaden. Die Belege liegen unter `var/verification/`, im Behälter an einem
eigenen dauerhaften Speicher, und kommen ausschliesslich über
`/api/verification/documents/[id]` heraus — eine Route, die vorher die Rolle
prüft. Wer nicht darf, bekommt 404 statt 403: eine 403 wäre die Bestätigung,
dass es unter dieser Kennung etwas gibt.

### Löschen nach 90 Tagen

Die Belege verschwinden 90 Tage nach der Entscheidung, die Entscheidung selbst
bleibt. Der Verwaltungsbereich räumt beim Öffnen auf; dazu als tägliche
Aufgabe auf dem Server (`crontab -e`):

```
30 3 * * * cd /root/leviz && docker compose run --rm migrate npx tsx scripts/purge-verification.ts >> /var/log/leviz-purge.log 2>&1
```

Beides zusammen, weil keins allein genügt: läuft die Zeitsteuerung nicht,
sammeln sich Ausweiskopien an, von denen niemand etwas ahnt — und schaut
monatelang niemand in die Verwaltung, ebenso.

---

## Anmeldung per Telefonnummer

Sie wird **nur angeboten, wenn ein echter SMS-Anbieter eingerichtet ist**.
Steht `SMS_DRIVER=console` — die Vorgabe —, landet der Code nur im Protokoll,
und der Reiter „Mit Telefon" erscheint gar nicht erst. Ein Weg, der zu einem
Code führt, den niemand bekommt, ist keine Anmeldemöglichkeit, sondern eine
Sackgasse; der Kunde sucht den Fehler dann bei sich.

In `lib/sms` steckt bisher nur der Terminal-Anbieter. Für den echten Betrieb
gehört dort ein Anbieter hinein — Twilio, oder ein Gateway aus der Region.
Jede SMS kostet Geld, deshalb ist das eine Entscheidung und keine
Voreinstellung. Ein unbekannter Wert in `SMS_DRIVER` lässt die Anwendung
laut scheitern, statt still auf das Terminal zurückzufallen.

---

## Bestandsimport für Händler

Ein Händler mit vierzig Autos legt keine vierzig Inserate von Hand an. Unter
`/paneli/importo` (`/konto/import`, `/dashboard/import`) lädt er eine
CSV-Datei aus dem Programm, das er ohnehin benutzt, und alle Fahrzeuge
entstehen auf einmal.

Die Seite steht nur bei Händlerkonten; die Aktionen dahinter prüfen das noch
einmal selbst.

### Zwei Schritte, und der erste ist der wichtige

Erst wird gezeigt, **was entstehen würde** — je Zeile, mit Fehlern und
Zeilennummer. Erst danach wird angelegt. Vierzig Inserate aus einer Datei zu
erzeugen, die niemand vorher gesehen hat, geht genau einmal gut; danach löscht
der Händler vierzig Inserate von Hand.

Angelegt wird über `saveListingAction` — **dieselbe** Funktion, die auch der
Inserats-Assistent benutzt. Ein eigener, schnellerer Weg wäre verlockend und
falsch: er liefe an Moderation, Qualitätsbewertung und Preisverlauf vorbei, und
der Unterschied fiele erst auf, wenn der Bestand schon drin ist.

### Was die Datei enthalten darf

Spaltennamen und Werte werden in allen drei Sprachen erkannt. `Marke`,
`marka`, `Hersteller` und `Make` sind dieselbe Spalte; `Naftë`,
`Diesel` und `Dizel` derselbe Kraftstoff. Wer auf exakte Vorlagen besteht,
bekommt keine Händler — er bekommt Händler, die es einmal versuchen und danach
wieder von Hand inserieren.

Eine Vorlage mit den passenden Spalten und einer Beispielzeile liegt unter
`/api/import/template?lang=sq|de|en`. Sie hat Semikolon als Trennzeichen und
eine Byte-Reihenfolge-Markierung, damit Excel sie richtig öffnet.

Erkannt wird außerdem, ohne dass der Händler etwas umstellen muss:

- **Trennzeichen** — Semikolon, Komma oder Tabulator, entschieden an der Kopfzeile
- **Zahlen** — `18.000`, `18,000`, `18 000`, `18.000 €` sind dasselbe
- **Leistung** — `190 PS` und `140 kW`; fehlt die Einheit, gilt PS
- **Datum** — `2018`, `03/2018`, `2018-03`
- **Ortsnamen** — `Prishtina` und `Prishtinë` sind dieselbe Stadt

Geraten wird nichts. Ein BMW **320d** landet nicht von selbst beim 3er: die
Zeile bekommt einen Fehler und daneben die Modelle, die es bei dieser Marke
gibt.

### Fotos

Die Spalte `Fotot`/`Bilder` enthält Adressen, getrennt durch `|`. Der
Server lädt sie herunter und legt sie im eigenen Speicher ab — ein Inserat, das
auf fremde Adressen zeigt, verliert seine Bilder, sobald der Händler seine Seite
umbaut. Ohne mindestens ein Foto entsteht kein Inserat; das verlangt der
Assistent genauso.

Das ist die heikelste Stelle des Imports: der Server ruft eine Adresse auf, die
jemand anderes bestimmt hat. Gesperrt sind deshalb alle Adressen, die nach innen
zeigen — Rückschleife, private Netze, der Metadatendienst `169.254.169.254`,
Nachbarn im Docker-Netz. Geprüft wird auch der aufgelöste Name, nicht nur die
Zeichenkette, und Weiterleitungen werden nicht verfolgt. Der Inhalt jeder Datei
wird an den ersten Bytes geprüft, nicht an der Endung.

### Grenzen

- **100 Fahrzeuge je Durchgang.** Für jedes werden Fotos von fremden Servern
  geholt; bei mehr sitzt der Händler vor einer Seite, die sich nicht rührt.
- **Die Paketgrenze gilt.** Passen nicht alle Zeilen hinein, wird vorher gesagt,
  wie viele angelegt werden.
- **Dieselbe Datei zweimal verdoppelt den Bestand nicht** — erkannt an der
  Fahrgestellnummer. Ohne VIN in der Datei kann das niemand unterscheiden.

### Beschreibung ergänzen

Ein Häkchen, standardmäßig gesetzt: fehlt die Beschreibung oder ist sie zu kurz,
wird sie **aus den Angaben derselben Zeile** gebildet — `BMW 3er · Viti 2018 ·
150.000 km · Naftë · Automatik · 190 kf`. Kein erfundener Werbetext, nur
dieselben Zahlen als Satz. Solche Zeilen werden in der Vorschau gekennzeichnet,
damit der Händler weiß, wo er nacharbeiten sollte.

Ohne das Häkchen gilt die Mindestlänge des Assistenten, und zu kurze Zeilen
werden abgelehnt.

### Entwurf oder sofort sichtbar

Ohne Häkchen liegen die Inserate als Entwurf bereit. Mit Häkchen laufen sie
durch `publishListingAction` — also durch dieselbe automatische Prüfung wie
sonst, die je Inserat entscheidet, ob es sofort erscheint oder auf eine Freigabe
wartet.

---

## API für die App

Die Website arbeitet mit Server Actions. Die kann nur die Website selbst
aufrufen — eine App nicht. Unter `/api/v1` liegt deshalb ein zweiter Eingang
zu **denselben Funktionen**: dieselbe Suche, dasselbe Ranking, dieselbe
Passwortprüfung, dieselbe Kontoanlage. Nichts davon ist doppelt geschrieben;
wo die Website vorher eigene Logik in einer Action hatte, ist sie in eine
gemeinsame Funktion gewandert, die beide rufen:

| Gemeinsam | Website | App |
|---|---|---|
| `lib/auth/password-login.ts` | Auth.js-Anbieter | `POST /auth/login` |
| `features/auth/create-account.ts` | `registerAction` | `POST /auth/register` |
| `features/favorites/core.ts` | `toggleFavoriteAction` | `/favorites` |
| `features/search/queries.ts` | Suchseite | `GET /vehicles` |

Ein Auto, das die App anlegt, erscheint auf der Website und in der
Verwaltung, weil es dieselbe Datenbank und dieselbe Funktion ist.

### Anmeldung ohne Cookie

Eine App hat keine Cookies, die ein Browser für sie verwaltet. Sie bekommt
zwei Token:

- **Zugriffs-Token** — ein signiertes JWT, 15 Minuten gültig, in jeder Anfrage
  als `Authorization: Bearer …`. Geprüft ohne Datenbank; Rolle und Sperrstatus
  tragen darin mit und gelten für seine kurze Laufzeit.
- **Erneuerungs-Token** — ein zufälliger Wert, 30 Tage gültig, in der
  Datenbank nur als Prüfsumme (`RefreshToken`). Bei jeder Erneuerung ersetzt.

Der Schlüssel des Zugriffs-Tokens wird aus `AUTH_SECRET` **abgeleitet**, nicht
direkt übernommen: Auth.js signiert seine Cookies mit demselben Geheimnis. So
geht ein Cookie-JWT hier niemals als Zugriffs-Token durch.

**Diebstahlerkennung.** Die App hält immer nur das neueste Erneuerungs-Token.
Taucht ein bereits ersetztes ein zweites Mal auf, wurde es kopiert — dann
verlieren *alle* Anmeldungen des Kontos ihre Gültigkeit, nicht nur diese
eine. Wer sein Passwort zurücksetzt, beendet ebenfalls alle App-Anmeldungen.

### Antwortform

Erfolg `{ "data": … }`, Fehler `{ "error": { "code", "message" } }` mit dem
passenden Status. Der `code` ist stabil und maschinenlesbar; übersetzt wird in
der App. Ein Validierungsfehler trägt `fields` mit Pfad und Meldung.

### Endpunkte

| | Pfad | Zweck |
|---|---|---|
| POST | `/auth/login` | `{ email, password, device? }` → Konto + Token |
| POST | `/auth/register` | wie das Formular, plus `locale`, `device` → 201 + Token |
| POST | `/auth/refresh` | `{ refreshToken }` → neues Paar |
| POST | `/auth/logout` | `{ refreshToken }` → 204 |
| GET | `/me` | das eigene Konto |
| GET | `/vehicles?…` | Suche — dieselben Filter wie `/kerko`, mit Marktpreis-Siegel |
| GET | `/vehicles/{slug}` | Fahrzeug, Verkäufer, Ähnliche, Preisschätzung, `favorited` |
| GET | `/catalog?locale=&make=` | Marken, Modelle, Städte, Länder, Ausstattung, Aufzählungen |
| GET | `/favorites` | Merkliste |
| POST | `/favorites` | `{ vehicleId }` merken |
| DELETE | `/favorites/{vehicleId}` | vergessen |
| GET | `/notifications?cursor=&limit=` | eigene Meldungen + `unread` |
| POST | `/notifications/{id}/read` | gelesen |
| GET | `/listings` | „Meine Inserate" — eigene und, für Händler, die des Autohauses |
| POST | `/listings` | Entwurf anlegen; der Rumpf ist genau das, was der Assistent der Website abschickt → 201 |
| GET | `/listings/options?locale=` | Marken, Städte, Herkunftsländer, Ausstattung, Fotogrenze des Pakets |
| GET | `/listings/{id}` | ein eigenes Inserat als Formularwerte (`values`) — fremde: 404 |
| PUT | `/listings/{id}` | aktualisieren |
| DELETE | `/listings/{id}` | endgültig löschen, samt Fotos → 204 |
| POST | `/listings/{id}/publish` | live schalten → `ACTIVE` oder `PENDING_REVIEW` |
| POST | `/listings/{id}/pause` | pausieren ↔ freischalten |
| POST | `/listings/{id}/sold` | verkauft → 204 |
| POST | `/uploads` | multipart `file` → `{ key, url }` (201); Magic Bytes, 8 MB, 120 je Fenster |
| DELETE | `/uploads` | `{ key }` — nur eigene → 204 |
| GET | `/me/profile` | Name, Telefon, Wohnort, Sprache, Städte |
| PATCH | `/me/profile` | speichern; Feldfehler als Schlüssel aus `account` |
| POST | `/devices` | `{ token, platform, device? }` — das Telefon für Push anmelden (201/200) |
| DELETE | `/devices` | `{ token }` — beim Abmelden → 204 |

Die Ratenbegrenzung für Anmeldung und Registrierung ist dieselbe wie auf der
Website. Nur öffentliche Inserate sind über die API erreichbar — ein Entwurf
ist von außen nicht da, auch nicht für den, der die Adresse kennt.

**Die Schreibpfade laufen durch dieselben Kerne wie die Website.**
`features/listings/core.ts`, `upload-core.ts` und `features/account/core.ts`
kennen keinen Cookie und kein Token, nur einen `Actor` — die Server Actions
holen ihn aus der Sitzung, die API aus dem Bearer-Token. Paketgrenzen,
Moderation, Qualitätswert und die Magic-Byte-Prüfung der Fotos gibt es
deshalb genau einmal. Fachliche Fehler (`ActionResult` mit `ok: false`)
werden zu `400 invalid` mit `message` und denselben `fields` wie bei Zod.

Noch nicht dabei, kommt mit den jeweiligen App-Bildschirmen: Nachrichten,
Suchaufträge.

### Push-Meldungen

Meldungen entstehen an zehn Stellen in Transaktionen — neue Nachricht,
Freigabe, Ablehnung, Preisänderung, Zahlung. Der Versand aufs Telefon hängt
**nicht** an diesen Stellen: `features/notifications/dispatch.ts` sieht alle
15 Sekunden nach, was seit dem letzten Mal angekommen ist, und holt es mit
einem einzigen `UPDATE … RETURNING` (`pushedAt`, `FOR UPDATE SKIP LOCKED`).
So bekommt nur, was auch wirklich gespeichert wurde, einen Push — und zwei
Läufe gleichzeitig nie dieselbe Meldung. Gestartet wird der Takt einmal je
Serverprozess aus `instrumentation.ts`.

Beansprucht werden nur Meldungen an Konten mit einem lebenden Gerät, und nur
aus den letzten 24 Stunden: wer sein Telefon erst nächste Woche anmeldet,
bekommt nicht den Stau von heute.

Hinter `lib/push/` steht der **Push-Dienst von Expo**: der Server spricht eine
HTTPS-Schnittstelle, Expo reicht an FCM (Android) und APNs (iOS) weiter. Die
Zugangsdaten zu FCM und APNs liegen bei Expo (`eas credentials`), nicht auf
dem Server. Ein Telefon, das es nicht mehr gibt, meldet der Dienst als
`DeviceNotRegistered` — sofort oder erst in der Quittung, die der Takt nach
einer Minute nachschlägt (`PushTicket`); das Gerät wird dann stillgelegt.

| Variable | Bedeutung |
|---|---|
| `PUSH_DRIVER` | `console` (Vorgabe: ins Protokoll) oder `expo` |
| `EXPO_ACCESS_TOKEN` | freiwillig; mit Token lehnt Expo Anfragen ab, die nicht von diesem Server kommen |

Beim Zurücksetzen des Passworts werden alle Gerätetoken des Kontos gelöscht —
ein Telefon, das nicht mehr angemeldet ist, soll auch keine „Neue Nachricht
von …" mehr auf dem Sperrbildschirm zeigen.

### Universal Links und App Links

Damit ein Link auf levizz.com die App öffnet statt den Browser, müssen zwei
Dateien unter `/.well-known/` liegen. `next.config.ts` leitet sie auf Routen
um, die aus der Umgebung lesen — ohne Werte antworten sie mit 404, denn eine
halbe Datei würde Apple stundenlang zwischenspeichern.

| Datei | Variable | Woher |
|---|---|---|
| `apple-app-site-association` | `APPLE_TEAM_ID` | developer.apple.com → Membership, zehn Zeichen |
| `assetlinks.json` | `ANDROID_CERT_SHA256` | Play Console → App-Signatur, oder `eas credentials`; mehrere kommagetrennt |

Prüfen: `curl https://levizz.com/.well-known/apple-app-site-association` muss
JSON mit `applinks` liefern, ohne Umleitung.

In der App landet so ein Link auf `+not-found`, weil `/vetura/…` keine Route
der App ist. `lib/i18n/match-pathname.ts` — dieselbe Pfadtabelle wie die
Website — sagt, welcher Bildschirm das ist, und die App leitet um. Was sie
nicht hat (Nachrichten, Händler), bekommt einen Knopf zur Website.

### Selbst prüfen

```bash
curl -s localhost:3000/api/v1/vehicles?make=bmw | head -c 400
```

```bash
curl -s -X POST localhost:3000/api/v1/auth/login -H 'content-type: application/json' \
  -d '{"email":"buyer@leviz.dev","password":"Leviz2026!"}'
```

---

## Die App (iOS und Android)

Unter `mobile/` liegt die LEVIZ-App — Expo mit React Native, ein Code für
beide Plattformen. Sie ist **die mobile Fassung von levizz.com, kein zweiter
Marktplatz**: sie spricht über `/api/v1` mit denselben Funktionen, und sie
teilt Code mit der Website, statt ihn abzuschreiben.

### Was geteilt wird

Metro (der Bundler von Expo) sieht das Hauptprojekt; `@/…` zeigt auf die
Wurzel des Repositories. Die App importiert daraus direkt:

| Aus dem Hauptprojekt | Wofür |
|---|---|
| `messages/{sq,de,en}.json` | alle 1 256 Texte je Sprache, unverändert |
| `features/search/schema.ts` | Sortierungen und die Aufzählungen der Filter |
| `lib/currency.ts`, `features/vehicles/format.ts` | Preis, Kilometer, Leistung — dieselbe Schreibweise wie auf der Website |
| `components/leviz/logo.tsx` (Pfade) | Wortmarke und Zeichen, nicht nachgezeichnet |

Geteilt werden nur reine Module. Was Next.js importiert, lässt sich hier
nicht laden — Metro sagt es dann laut, statt still etwas anderes zu bündeln.

Die Texte kommen über ICU MessageFormat an, wie bei next-intl:
`{count}` und `{count, plural, …}` funktionieren unverändert.

### Starten

```bash
cd mobile && npm install && npx expo start
```

Dann **Expo Go** aus dem App Store oder Play Store auf dem Telefon öffnen und
den QR-Code aus dem Terminal scannen. Die App läuft gegen `levizz.com`.

Gegen den lokalen Server: in `mobile/.env` die Adresse des Rechners im WLAN
eintragen — nicht `localhost`, das meint auf dem Telefon das Telefon selbst:

```
EXPO_PUBLIC_API_URL=http://192.168.1.20:3000
```

Für die Entwicklung ohne Telefon gibt es die Web-Fassung
(`npx expo start --web`), die dieselben Bildschirme im Browser zeigt. Dafür
gibt die API `/api/v1` CORS frei — unbedenklich, weil an ihr nichts an Cookies
hängt.

### Anmeldung

Zugriffs- und Erneuerungs-Token liegen im Schlüsselbund des Telefons
(`expo-secure-store`), nie im normalen Speicher. Läuft das Zugriffs-Token ab,
erneuert die App es einmal und wiederholt die Anfrage — und zwar
**höchstens einmal gleichzeitig**: laufen drei Anfragen parallel in ein
abgelaufenes Token, darf nur eine erneuern. Sonst legte die zweite ein bereits
ersetztes Token vor, und der Server hielte das für Diebstahl.

### Was in Phase 1 drin ist

Start, Suche mit Filtern und Sortierung, Fahrzeugseite mit Galerie,
Preisschätzung, Anruf/WhatsApp/Viber und Teilen, Merkliste, Anmeldung und
Registrierung (privat und Autosallon), Konto mit Sprachwahl. Alles lesend,
alles gegen die echte API.

### Was in Phase 2 drin ist

**Inserat anlegen** — derselbe Assistent mit denselben neun Schritten. Die
Schritte, ihre Reihenfolge und die Prüfung je Schritt kommen aus
`features/listings/schemas.ts`: die App prüft mit demselben Zod-Schema, mit
dem der Server später prüft. Der Qualitätswert in der Vorschau ist
`calculateQualityScore` aus dem Hauptprojekt — dieselbe Funktion, die die
Reihung in der Suche bestimmt.

**Fotos** werden auf dem Telefon verkleinert, bevor sie ins Netz gehen — auf
dieselbe Kante wie im Browser (`features/listings/image-policy.ts`: 1920 px,
JPEG 82 %). Aus einem 5-MB-Handyfoto werden ~300 KB. Jeder Upload hat seinen
eigenen Fortschrittsbalken (XMLHttpRequest statt fetch, weil nur XHR den
Fortschritt des Sendens meldet). Das erste Foto ist das Hauptbild; verschoben
wird mit Pfeilen, nicht mit Ziehen — auf einem Telefon ist ein Pfeil nie
danebengegriffen.

**Meine Inserate** mit Veröffentlichen, Bearbeiten, Pausieren, Verkauft,
Löschen; **Bearbeiten** öffnet den Assistenten vorbelegt — die
Rückübersetzung vom Datensatz in die Felder (`form-values.ts`) ist dieselbe
wie für die Bearbeiten-Seite der Website. **Profil** mit Name, Telefon,
Wohnort, Sprache; Feldfehler kommen als Schlüssel aus `account` und werden in
der App übersetzt.

### Was in Phase 3 drin ist

**Push.** Nach der Anmeldung holt die App ein Token vom Push-Dienst von Expo
und hinterlegt es unter `POST /devices`; beim Abmelden meldet sie es ab.
Angetippte Meldungen führen dorthin, wo sie hingehören — in der App, wenn
sie den Bildschirm hat, sonst auf die Website — und gelten als gelesen.
**Meldungen** haben einen eigenen Bildschirm: der erste im ganzen Projekt,
der diese Tabelle liest. **Deep Links** von levizz.com landen im richtigen
Bildschirm (siehe „Universal Links und App Links"). **Teilen** aus Meine
Inserate und nach dem Veröffentlichen — geteilt wird immer die Adresse der
Website, mit App landet der Empfänger in der App.

**Was du dafür einmalig tun musst** (alles ohne Mac):

1. `cd mobile && npx eas init` — legt das EAS-Projekt an und schreibt die
   `projectId` nach `app.json`. Ohne sie gibt es kein Push-Token; die App
   sagt das im Protokoll, statt zu stürzen.
2. Android: ein Firebase-Projekt anlegen, App `com.levizz.app` hinzufügen,
   `google-services.json` nach `mobile/` legen und in `app.json` unter
   `android.googleServicesFile` eintragen. Dann den FCM-V1-Dienstkontoschlüssel
   mit `npx eas credentials` hochladen.
3. iOS: mit `npx eas credentials` einen APNs-Schlüssel erzeugen lassen
   (braucht das Apple-Entwicklerkonto).
4. Server: `PUSH_DRIVER=expo` in der `.env`.

Seit SDK 53 kommen Push-Meldungen auf Android nicht mehr in Expo Go an —
dafür braucht es einen Development Build (`npx eas build --profile
development`). iOS Expo Go zeigt sie.

**Was noch auf die Website führt:** Nachrichten — kommen mit Phase 4.

### Bauen und einreichen — ohne Mac

Kommt mit Phase 5 (EAS Build und EAS Submit). Die Kennungen stehen schon in
`app.json`: `com.levizz.app` für beide Stores, Name **LEVIZ**, Schema
`leviz://`, und die Pfade für Universal Links auf `levizz.com` in allen drei
Sprachen.

---

## Rechtliche Seiten

Sechs Seiten, in allen drei Sprachen mit übersetzten Pfaden:

| Seite | Albanisch | Deutsch | Englisch |
|---|---|---|---|
| Nutzungsbedingungen | `/kushtet` | `/agb` | `/terms` |
| Widerruf | `/terheqja` | `/widerruf` | `/withdrawal` |
| Datenschutz | `/privatesia` | `/datenschutz` | `/privacy` |
| Cookies | `/cookies` | `/cookies` | `/cookies` |
| Impressum | `/impressum` | `/impressum` | `/imprint` |
| Kontakt | `/kontakti` | `/kontakt` | `/contact` |

Der gesamte Text liegt in den Sprachdateien unter `legal`; Aufzählungen
entstehen aus Absätzen, die mit `· ` beginnen. Ein Test prüft, dass jedes
Dokument in allen drei Sprachen **gleich viele Abschnitte** hat — eine
fehlende Klausel in einer Sprache wäre eine andere Rechtslage für diese Leser.

### Die Betreiberangaben fehlen absichtlich

`lib/legal.ts` ist leer ausgeliefert. Erfundene Registernummern oder
Anschriften wären keine Platzhalter, sondern falsche Angaben über ein
Unternehmen — und beim Zahlungsdienstleister fallen sie ohnehin auf.

Solange etwas fehlt, benennt die Impressumsseite die fehlenden Felder sichtbar
und zeigt nur die ausgefüllten. Ein Impressum mit „Musterstraße 1" wäre
schlimmer als gar keins: es sieht vollständig aus und ist trotzdem falsch.

> Die Texte sind sorgfältige Entwürfe, **keine anwaltlich geprüften
> Dokumente**. Vor dem Livegang von einer Juristin oder einem Juristen im
> Kosovo prüfen lassen — die albanische Fassung zusätzlich von einer
> Muttersprachlerin, weil es bei Rechtstexten auf die Wortwahl ankommt.

### Zustimmung zur sofortigen Ausführung

Die Leistung beginnt mit der Zahlung: das Paket läuft, die Hervorhebung ist
sichtbar. Das Widerrufsrecht erlischt dabei nur, wenn der Käufer der sofortigen
Ausführung **vorher ausdrücklich zugestimmt** hat. Ohne diese Zustimmung könnte
er vierzehn Tage lang zurückgeben, was längst erbracht ist.

Deshalb steht über jedem Kaufknopf ein Häkchen mit genau diesem Satz, daneben
der Verweis auf die Widerrufsseite — niemand soll einem Verzicht zustimmen, den
er nicht nachlesen kann. Der Knopf bleibt bis dahin gesperrt.

Geprüft wird das **auf dem Server**, nicht nur im Formular: `startCheckout`
weist ohne Zustimmung ab. Ein Häkchen, das der Browser setzt, ist kein Nachweis
— wer die Aktion direkt aufruft, umginge es.

Festgehalten wird der Zeitpunkt an der Zahlung selbst
(`Payment.withdrawalConsentAt`). Eine Zustimmung, die sich nicht belegen lässt,
ist im Streitfall keine. Ältere Buchungen aus der Zeit davor haben das Feld
leer — es wird kein Wert erfunden.

---

## Payten (Nestpay)

Die gehostete Bezahlseite vieler Banken im Westbalkan. `PAYMENTS_DRIVER="payten"`
schaltet sie ein; die vier Werte kommen aus dem Händlervertrag:

| Variable | Woher |
|---|---|
| `PAYTEN_GATEWAY_URL` | Adresse der Bezahlseite, z. B. `https://<bank>/fim/est3Dgate` |
| `PAYTEN_CLIENT_ID` | Händlernummer (`clientid`) |
| `PAYTEN_STORE_KEY` | Ladenschlüssel — **ein Geheimnis** |
| `PAYTEN_STORE_TYPE` | leer lassen für `3d_pay_hosting` |

### Warum die Prüfsumme hier alles trägt

Payten schickt das Ergebnis **nicht von Server zu Server**, sondern lässt den
Browser des Käufers ein Formular an unsere Rückkehradresse abschicken. Der
Absender ist damit vollständig unvertrauenswürdig: jeder könnte dieselbe
Anfrage von Hand stellen und eine bezahlte Buchung behaupten.

Die einzige Absicherung ist die Prüfsumme über *alle* übermittelten Felder,
gebildet mit dem Ladenschlüssel, den nur die Bank und wir kennen. Deshalb liegt
sie als reine Funktion in `lib/payments/payten.ts` mit 29 Tests — darunter der
Fall einer erfundenen Prüfsumme und der eines nachträglich veränderten Betrags.

Drei Feinheiten, an denen die Berechnung sonst scheitert:

**Sortierung ohne Rücksicht auf Groß- und Kleinschreibung.** Die Bank mischt
die Schreibweisen, `oid` steht neben `Response`.

**Maskierung von `|` und `\`.** Ein Trennzeichen im Wert verschöbe sonst die
Feldgrenzen, und `{a: "x|y"}` ergäbe dieselbe Summe wie `{a: "x", b: "y"}`.

**`hash` und `encoding` bleiben aussen vor.** Das eine ist das Ergebnis selbst,
das andere nimmt die Bank aus der Berechnung.

### Was die Bank noch bestätigen muss

Der Ablauf folgt der Nestpay-Spezifikation, aber drei Dinge unterscheiden sich
je Bank. Klär sie, bevor echtes Geld fliesst:

- die **Gateway-Adresse** und ob sie `3d_pay_hosting` oder `pay_hosting` nutzt
- die **Hash-Version** — hier ist `ver3` gesetzt, ältere Installationen kennen `ver2`
- ob es zusätzlich einen **Server-zu-Server-Rückruf** gibt; `parseWebhook` kann ihn

**Vor dem Livegang in der Testumgebung der Bank durchspielen.** Eine Prüfsumme,
die um ein Feld danebenliegt, fällt erst dort auf.

---

## Einen echten Zahlungsanbieter anbinden

Der Ablauf steht vollständig und ist anbieterunabhängig: Zahlung anlegen →
Nutzer auf die Bezahlseite → Erfüllung **erst** nach signiertem Rückruf. Der
Mock-Anbieter durchläuft genau diese Schritte, nur liegt seine Bezahlseite in
der eigenen Anwendung.

Anzubinden sind zwei Methoden in `lib/payments/index.ts`:

**`createCheckout`** meldet die Zahlung beim Anbieter an. Zwei Rückgabeformen:

| Fall | Rückgabe |
|---|---|
| Anbieter vergibt eine Sitzungsadresse | `{ url, method: 'GET' }` |
| Gehostete Bankseite erwartet ein Formular | `{ url, method: 'POST', fields }` |

Banken im Westbalkan verlangen üblicherweise das Formular — Betrag,
Rückkehradressen und eine Prüfsumme über die Felder. Deshalb gehen diese Werte
im Rumpf mit, nicht in der Adresszeile: dort landeten sie im Browserverlauf, im
Verweis-Kopf der Folgeseite und in den Protokollen jedes Servers dazwischen.
`features/packages/redirect.ts` baut und verschickt dieses Formular.

**`parseWebhook`** prüft die Signatur des Rückrufs und gibt `null` zurück,
sobald etwas nicht stimmt. Die Route antwortet dann mit 400 und ändert nichts.
Das ist die einzige Stelle, an der eine Zahlung als bezahlt gilt.

Alles Übrige bleibt unverändert: `features/packages/actions.ts` unterscheidet
bereits zwischen eigener und fremder Bezahlseite, und `applyPaymentEvent` ist
idempotent — ein doppelt zugestellter Rückruf bucht nicht zweimal.

Ein unbekannter Wert in `PAYMENTS_DRIVER` fällt **nicht** still auf den Mock
zurück, sondern wirft. Sonst liefe im Betrieb eine Scheinzahlung durch, die
niemand bemerkt.

**Kartennummern dürfen nie durch LEVIZ laufen.** Die Eingabe gehört auf die
Seite des Anbieters, sonst greift PCI-DSS mit voller Härte.

---

## Auf einem eigenen Server (Docker)

Für einen VPS mit Ubuntu. Drei Behälter: die Anwendung, PostgreSQL und ein
Webserver, der sein TLS-Zertifikat selbst besorgt und erneuert.

### Einmalig auf dem Server

```bash
curl -fsSL https://get.docker.com | sh
git clone https://github.com/enisikqikve-dot/leviz.git
cd leviz
cp docker/env.example .env
nano .env
```

In der `.env` mindestens ausfüllen: `SITE_DOMAIN`, `NEXT_PUBLIC_SITE_URL`,
`POSTGRES_PASSWORD` und `AUTH_SECRET` (`openssl rand -base64 32`).

**Die Domäne muss vorher per DNS auf den Server zeigen.** Sonst bekommt Caddy
kein Zertifikat, und der Start endet in einer Schleife aus Fehlversuchen.

**Swap anlegen — nicht überspringen.** Ein VPS mit 4 GB und ohne Swap friert
ein, statt abzustürzen: ist der Speicher voll, kann der Kernel nur noch den
Dateicache wegwerfen, also die Programmseiten von sshd, Caddy und Node selbst.
Jeder Prozess liest dann seinen eigenen Code alle paar Millisekunden neu von
der Platte, nichts antwortet mehr, und der OOM-Killer greift nie, weil er ja
„noch etwas freimachen" kann. Genau so stand levizz.com am 13.09.2026 drei
Stunden mit 40 MB freiem Speicher, bevor SSH und HTTPS ganz verstummten.

```bash
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
```

```bash
echo '/swapfile none swap sw 0 0' >> /etc/fstab && echo 'vm.swappiness=10' > /etc/sysctl.d/90-swap.conf && sysctl -p /etc/sysctl.d/90-swap.conf
```

`swapon --show` muss danach die 2 GB zeigen. `swappiness=10` heißt: der Swap
ist Reserve für den Notfall, nicht Alltag.

### Starten

```bash
docker compose up -d --build
```

> Der Speicher der Datenbank haengt an `/var/lib/postgresql`, nicht an
> `/var/lib/postgresql/data`. Ab PostgreSQL 18 ist das Pflicht — sonst
> verweigert das Abbild den Start mit einem Hinweis auf `pg_ctlcluster`.

Der erste Lauf dauert einige Minuten. Ein eigener Dienst `migrate` wendet
zuerst die Migrationen an und beendet sich; erst danach startet die Anwendung.
Schlägt die Migration fehl, startet sie gar nicht — gegen ein veraltetes Schema
richtet sie mehr Schaden an als eine, die steht.

Die Migration läuft bewusst **nicht** im Anwendungscontainer: der enthält nur
das Nötigste, und der Prisma-Befehl bringt eine eigene Kette von
Abhängigkeiten mit. Der `migrate`-Dienst nutzt die Bau-Stufe, in der ohnehin
alles liegt — er kostet daher keine zusätzliche Bauzeit.

### Katalog einspielen

Einmalig, danach ist die Plattform benutzbar:

```bash
docker compose exec app node -e "process.exit(0)" &&   docker compose run --rm app npx tsx prisma/seed.ts --catalog
```

**Nicht `db:seed`** — der legt 242 erfundene Fahrzeuge an und bricht gegen eine
entfernte Datenbank ohnehin ab.

### Verwalterkonto anlegen

```bash
docker compose run --rm app npx tsx scripts/create-admin.ts deine@adresse.tld "Dein Name"
```

### Aktualisieren

```bash
git pull && docker compose up -d --build
```

### Speicher: was den Server einfrieren kann

Die teuerste Arbeit auf dem Server ist das **Umrechnen der Fotos**. Verkäufer
laden Handybilder mit 12 Megapixeln hoch; für jede Anzeige rechnet
`next/image` daraus die passenden Breiten. Ein einzelnes Bild belegt beim
Dekodieren ~50 MB, und eine Fahrzeugseite mit zwanzig Fotos löst zwanzig
solche Umrechnungen gleichzeitig aus. In AVIF kostete das zusätzlich
Sekunden je Bild auf dem einen Kern — deshalb ist in `next.config.ts` nur
noch WebP eingeschaltet, mit fünf statt acht Breiten und 31 Tagen Cache.

Drei Sicherungen halten das im Zaum, alle in `docker-compose.yml`:

| | |
|---|---|
| `mem_limit` je Behälter | 2 GB Anwendung, 768 MB Datenbank, 256 MB Caddy. Stirbt die Anwendung an ihrer Grenze, startet sie zehn Sekunden später neu — der Server selbst bleibt erreichbar. |
| `memswap_limit` = `mem_limit` | Kein Swap für die Behälter. Lieber ein sauberer Neustart als minutenlang über die Platte kriechen. |
| `image-cache` | Der Cache der fertigen Bildgrößen überlebt ein Deploy. Sonst rechnet der Server nach jedem `up --build` jedes Foto neu — genau die Welle, die ihn eingefroren hat. |

Dazu `NODE_OPTIONS=--max-old-space-size=1024` (V8 räumt auf, lange bevor die
Grenze greift) und `MALLOC_ARENA_MAX=2` (glibc gibt sonst den Speicher nach
einer Bildspitze nie zurück — der Belegstand blieb nach jeder Welle höher als
vor ihr).

**Wenn es trotzdem hängt** — Ping geht, Ports sind offen, aber HTTPS und SSH
liefern nichts — ist es fast sicher der Speicher. Über die Web-Konsole im
Hostinger-Panel oder nach einem Neustart:

```bash
sar -r -f /var/log/sysstat/sa$(date +%d) | tail -n 20
```

zeigt den Speicherverlauf des Tages in 10-Minuten-Schritten (`kbavail` unter
100 000 = Alarm), und

```bash
journalctl -b -1 --no-pager | grep -c 'memory pressure'
```

zählt die Warnungen von journald im vorigen Lauf. `journalctl --list-boots`
sagt, welcher Lauf welcher ist; ein Neustart aus dem Panel erzeugt zwei
Einträge, der eigentliche Lauf davor ist dann `-2`.

### Sicherung

Ein eigener Server heißt, dass niemand sonst sichert. `docker/backup.sh` legt
Datenbank und Fotos zusammen ab, prüft jede erzeugte Datei und räumt alte
Stände auf. Einmalig einrichten:

```bash
chmod +x ~/leviz/docker/backup.sh
~/leviz/docker/backup.sh
```

Wenn dieser Lauf durchgeht, in `crontab -e` eine Zeile anfügen — jede Nacht
um 3:15 Uhr:

```
15 3 * * * /root/leviz/docker/backup.sh >> /var/log/leviz-backup.log 2>&1
```

Die Sicherungen liegen in `~/leviz-sicherung`, 14 Tage werden aufbewahrt.
Mehrere Tage deshalb, weil ein versehentlich gelöschtes Inserat selten am
selben Tag auffällt — eine Sicherung, die den Fehler schon mitgeschrieben
hat, nützt nichts.

**Den Verlust des Servers deckt das nicht ab.** Die Dateien liegen auf
derselben Platte. Sie retten vor dem falschen Befehl und vor gelöschten
Daten, nicht vor einem Totalausfall. Dagegen hilft nur eine Kopie woanders;
die Befehle zum Herunterladen und zum Zurückspielen stehen im Kopf des
Skripts.

### Was du sonst im Blick behalten musst

Systemaktualisierungen (`apt upgrade`), ein aktives `ufw` mit nur den Ports
22, 80 und 443, sowie regelmässige `docker compose pull` für die
Basis-Abbilder.

> **Läuft.** Das Abbild wird auf einem Hostinger-VPS gebaut und betrieben,
> Caddy besorgt das Zertifikat selbst. Auf dem Entwicklungsrechner bleibt
> Docker unbenutzbar (WSL fehlt) — Änderungen am `Dockerfile` oder an
> `docker-compose.yml` zeigen sich also erst auf dem Server.

---

## Veröffentlichen

LEVIZ läuft nicht als Dateisammlung auf einem Webspace: Server Components,
Server Actions und die Anmeldung rechnen bei jedem Aufruf auf dem Server.
Gebraucht werden ein dauerhaft laufender Node-Prozess, **PostgreSQL** (nicht
MySQL) und ein Dateispeicher.

Der Weg mit den wenigsten beweglichen Teilen: **Vercel** für die Anwendung,
**Supabase** für die Datenbank, **Cloudflare R2** für die Bilder.

### 1. Datenbank

Im Supabase-Dashboard unter *Project Settings → Database → Connection string*
beide Adressen holen. Die gepoolte (Port 6543) nimmt die Anwendung, die direkte
(Port 5432) brauchen Migrationen und der Seed — der Pooler kann keine
Transaktion über mehrere Anweisungen halten.

```bash
DATABASE_URL="…pooler…:6543/postgres?pgbouncer=true" npm run db:migrate
npm run db:catalog
```

**Nicht `db:seed`.** Der legt 242 erfundene Fahrzeuge und 20 erfundene
Autohäuser an — Angebote, die niemand verkauft, und Händler, die niemand
anrufen kann. `db:catalog` spielt nur die Nachschlagewerke ein: Länder, Städte,
Marken, Modelle, Ausstattung, Pakete. Inserate legen echte Nutzer selbst an.

Falls die Verwechslung doch passiert: `db:seed` bricht von sich aus ab, sobald
`DATABASE_URL` nicht auf den eigenen Rechner zeigt.

### 2. Bildspeicher

Auf Vercel ist das Dateisystem flüchtig: jede Veröffentlichung startet mit
einem leeren Verzeichnis, hochgeladene Verkäuferfotos wären danach weg. Deshalb
`STORAGE_DRIVER="s3"` mit einem R2-Bucket.

In Cloudflare: R2 → Bucket anlegen → *Settings → Public access* eine Domäne
freischalten (`…r2.dev` oder eigene) → *Manage API tokens* → Schlüsselpaar mit
Schreibrecht.

| Variable | Woher |
|---|---|
| `STORAGE_ENDPOINT` | `https://<konto-id>.r2.cloudflarestorage.com` |
| `STORAGE_REGION` | `auto` |
| `STORAGE_BUCKET` | Name des Buckets |
| `STORAGE_ACCESS_KEY` / `STORAGE_SECRET_KEY` | aus dem API-Token |
| `STORAGE_PUBLIC_URL` | die öffentliche Domäne des Buckets |

Fehlt eine davon, startet die Anwendung mit einer Fehlermeldung, die den Namen
nennt. Ein stiller Rückfall auf die Festplatte sähe im Betrieb aus wie ein
Erfolg und verlöre jedes Bild.

### 3. Vercel

Repository verbinden, Framework wird als Next.js erkannt, dann die Variablen
setzen. `postinstall` ruft `prisma generate` auf — ohne diesen Schritt fehlt der
erzeugte Client, weil `lib/generated/` nicht im Repository liegt.

| Variable | Wert |
|---|---|
| `DATABASE_URL` | gepoolte Supabase-Adresse |
| `AUTH_SECRET` | `npx auth secret` |
| `NEXT_PUBLIC_SITE_URL` | die echte Domäne, **ohne Schrägstrich am Ende** |
| `STORAGE_*` | siehe oben |
| `EMAIL_DRIVER`, `SMS_DRIVER` | `console`, bis echte Anbieter hinterlegt sind |

`NEXT_PUBLIC_SITE_URL` ist nicht optional: daraus entstehen die kanonischen
Adressen, `hreflang` und die Sitemap. Bleibt sie leer, zeigen alle drei auf
`localhost` — Suchmaschinen finden die Seite dann nicht.

`AUTH_URL` kann leer bleiben; Auth.js liest die Adresse aus der Anfrage, weil
`trustHost` gesetzt ist.

### Was vorher noch fehlt

- **Missbrauchsschutz zählt je Instanz.** `lib/rate-limit` liegt im Speicher.
  Auf Vercel läuft jede Instanz für sich, die Grenzen wirken damit schwächer als
  lokal. Für den Livebetrieb gehört dahinter ein gemeinsamer Zähler.
- **E-Mail und SMS gehen ins Nichts**, solange die Treiber auf `console` stehen.
  Passwort-Zurücksetzung und Telefonanmeldung funktionieren dann nicht.
- **RLS bei Supabase** ist nicht aktiviert. Solange nur Prisma über die
  Postgres-Verbindung spricht, ist das keine Lücke; sobald jemand den
  öffentlichen Schlüssel benutzt, schon.

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
| `npm run test:e2e` | End-zu-End-Tests (Playwright, eigener Chrome) |
| `npm run db:init` | PostgreSQL-Cluster einmalig anlegen und starten |
| `npm run db:start` | Lokale Datenbank starten |
| `npm run db:stop` | Lokale Datenbank stoppen |
| `npm run db:status` | Läuft die Datenbank? |
| `npm run db:migrate` | Migration erzeugen und anwenden |
| `npm run db:seed` | Beispieldaten einspielen (nur lokal) |
| `npm run db:catalog` | Nur den Katalog einspielen (echte Installation) |
| `npm run db:clear` | Erfundene Inhalte entfernen, Katalog behalten |
| `npm run db:studio` | Prisma Studio öffnen |
| `npm run admin:create` | Verwalterkonto anlegen oder hochstufen |
| `npm run db:reset` | Datenbank zurücksetzen und neu befüllen |
| `npm run brand:avatar` | Profilbilder für soziale Netzwerke erzeugen |
| `npm run brand:social` | Beitragsbilder für soziale Netzwerke erzeugen |
| `npm run brand:shots` | Seiten in Telefonformat aufnehmen (Chrome nötig) |
| `npm run brand:video` | 20-Sekunden-Video aus den Aufnahmen bauen (ffmpeg nötig) |

Die fertigen Videos liegen unter `public/brand/`: `leviz-reel.mp4` und
`leviz-reel-2.mp4` sind die 20-Sekunden-Fassungen aus der Pipeline,
`leviz-reel-3.mp4` eine längere, ausserhalb erstellte Fassung.

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

## Die vier Helfer

Was anderswo „KI-Funktionen“ heißt, rechnet und formuliert hier selbst. Das ist
keine Notlösung, bis ein Schlüssel da ist — für drei der vier Aufgaben ist es
die bessere Lösung.

### Beschreibungsvorschlag

Der Assistent baut den Text ausschließlich aus Feldern, die der Verkäufer
eingetragen hat. Fehlt eine Angabe, fehlt der Satz — es wird nichts ergänzt.

Genau das ist der Punkt: Ein Sprachmodell schreibt bereitwillig „gepflegter
Zustand, scheckheftgepflegt“ zu einem Fahrzeug, bei dem nichts davon angegeben
wurde. Auf einem Fahrzeugmarktplatz ist das eine Falschangabe, für die der
Verkäufer haftet. Der Kommentar in [`lib/ai/openai.ts`](lib/ai/openai.ts) hält
das für den Tag fest, an dem ein Modell angebunden wird.

### Suchassistent

Freitext wird gegen den **echten** Marken-, Modell- und Städtekatalog gelesen,
nicht geraten. „Golf naftë automatik deri 8000 euro në Prishtinë“ ergibt
`?make=volkswagen&model=golf&fuel=DIESEL&transmission=AUTOMATIC&priceMax=8000&city=prishtine`.

Zwei Entscheidungen dabei:

- Das Ergebnis läuft durch dasselbe Zod-Schema wie jede andere Suche. Der
  Assistent ist eine Eingabehilfe, kein zweiter Weg an der Prüfung vorbei.
- Er zeigt vor dem Ausführen, was er verstanden hat **und was nicht**. Eine
  still gesetzte Preisgrenze, die niemand gemeint hat, wäre schlimmer als eine
  Rückfrage.

### Preisschätzung

Ein Preis ist eine Zahl, die aus tatsächlichen Angeboten folgt — ein Modell
würde sie plausibel klingend erfinden, ohne dass jemand sie nachrechnen kann.
[`features/pricing/estimate.ts`](features/pricing/estimate.ts) gewichtet
Vergleichsfahrzeuge nach Baujahr und Kilometerstand, wirft Ausreißer weg und
gibt Spanne, Mittelwert und **Stichprobengröße** zurück.

Zwei Regeln halten die Aussage ehrlich:

- Unter vier Vergleichsfahrzeugen gibt es keine Schätzung. Eine Zahl aus zwei
  Angeboten wäre eine Behauptung.
- Reicht das gleiche Modell nicht, wird nur auf gleiche Marke **und** gleiche
  Karosserieform **und** Baujahr ±5 erweitert. Ein 5er gegen alle BMW gerechnet
  ergäbe zwangsläufig „unter dem Marktmittel“, weil X5 und 7er den Schnitt
  heben.

### Empfehlungen

Ähnliche Fahrzeuge auf der Detailseite kommen aus Marke, Modell, Preisnähe und
Karosserieform — nachvollziehbar und ohne Profilbildung.

---

## Für Suchmaschinen

Albanisch, Deutsch und Englisch haben **unterschiedliche Pfade** für dieselbe
Seite — `/vetura/…` gegen `/de/fahrzeug/…` gegen `/en/vehicle/…`. Ohne
ausdrücklichen Hinweis erkennt keine Suchmaschine, dass das Übersetzungen sind;
sie behandelt die drei als konkurrierende Seiten und spielt im Kosovo womöglich
die englische aus.

Deshalb nennt **jede** öffentliche Seite ihre kanonische Adresse und alle
Sprachfassungen ([`lib/seo/alternates.ts`](lib/seo/alternates.ts)), und die
Sitemap führt sie zusätzlich mit. `x-default` zeigt auf Albanisch.

| | |
|---|---|
| Sitemap | `/sitemap.xml` — statische Seiten, alle aktiven Fahrzeuge, alle Händler |
| robots.txt | sperrt Konto, Verwaltung, Bezahlseiten und die API |
| Strukturierte Daten | `Vehicle` je Inserat, `Organization` und `WebSite` auf der Startseite |

Gefilterte Ergebnislisten stehen auf `noindex, follow`: die Links darin sollen
verfolgt werden, die Liste selbst gehört nicht in den Index.

---

## Sicherheitskopfzeilen

Gesetzt in [`next.config.ts`](next.config.ts), je mit einem Grund:

| Kopfzeile | Wogegen |
|---|---|
| `X-Frame-Options: DENY` | Fremde setzen LEVIZ in einen Rahmen und fangen Klicks ab |
| `X-Content-Type-Options: nosniff` | Ein hochgeladenes Bild wird als Skript ausgeführt |
| `Referrer-Policy` | Der Zielserver erfährt, welches Fahrzeug jemand angesehen hat |
| `Permissions-Policy` | Kamera, Mikrofon und Bezahlschnittstelle bleiben aus |
| `Strict-Transport-Security` | Rückfall auf HTTP |

Unter `/uploads` gilt zusätzlich eine eigene Inhaltsrichtlinie. Hochgeladene
Dateien liegen unter derselben Herkunft wie die Anwendung — ohne diese Sperre
könnte eine als Bild getarnte HTML-Datei Skripte im Namen von LEVIZ ausführen.

---

## End-zu-End-Tests

```bash
npm run test:e2e
```

64 Tests über Desktop und Telefon. Zwei Entscheidungen dahinter:

**Geprüft wird gegen einen Produktionsbuild**, nicht gegen `next dev`. Zwei
Fehler dieses Projekts sind ausschließlich im Produktionsbuild aufgetreten —
ein Export aus einer `'use server'`-Datei kam im Browser als Platzhalter an und
ließ die Fahrzeugseite in allen drei Sprachen mit 500 antworten.

**Die Autorisierung wird über die Adresszeile geprüft**, nicht über versteckte
Schaltflächen. Ein Käufer, der `/admin` direkt aufruft, muss 403 bekommen — dass
der Verweis im Menü fehlt, ist kein Schutz.

Abgedeckt sind unter anderem: Rollen und Sperren, gleiche Fehlermeldung für
falsches Passwort und unbekanntes Konto, Ausbremsen wiederholter Fehlversuche,
Suche mit Filtern und mit unsinnigen Werten, der Suchassistent, Merkliste,
Vergleich, alle drei Sprachen, Sitemap, robots.txt und die Sicherheitskopfzeilen.

Playwright nutzt den vorhandenen Chrome (`channel: 'chrome'`); es wird kein
zusätzlicher Browser heruntergeladen.

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

## Einstellungen

`/dashboard/settings` (`/paneli/cilesimet`, `/konto/einstellungen`) mit drei
Bereichen, jeder für sich speicherbar:

| Bereich | Inhalt |
|---|---|
| Profil | Name, Telefon, Wohnort, Sprache der E-Mails |
| Benachrichtigungen | E-Mail und SMS getrennt schaltbar |
| Passwort | Ändern nach Eingabe des alten Passworts |

Die E-Mail-Adresse steht nur zur Anzeige. Sie zu ändern hieße, sie danach zu
bestätigen — und diese Bestätigung gibt es in LEVIZ noch nicht.

Konten aus GitHub oder Telefonanmeldung haben nie ein Passwort gesetzt; dort
steht statt des Formulars ein Hinweis. Der Wechsel ist auf sechs Versuche je
Viertelstunde begrenzt, gezählt nach Konto: gebremst wird nicht der
Anmeldeversuch, sondern das Durchprobieren des alten Passworts an einem offen
stehenden Browser.

**Sitzungen lassen sich nicht zurückrufen.** Sie liegen als JWT im Cookie, ein
bereits angemeldetes Gerät bleibt deshalb bis zum Ablauf des Tokens angemeldet
— auch nach einer Passwortänderung.

Die Aktionen geben Übersetzungsschlüssel zurück statt fertiger Sätze. Der
Server kennt die Anzeigesprache nicht zuverlässig; sonst stünde eine deutsche
Meldung auf einer albanischen Seite.

---

### Eigenes Verwalterkonto anlegen

Die vier Demo-Konten gehören zu den Beispieldaten. Ein echtes Verwalterkonto
entsteht mit:

```bash
npm run admin:create -- deine@adresse.tld "Dein Name"
```

Das Passwort wird verdeckt abgefragt, nicht als Argument übergeben — sonst
stünde es im Terminalverlauf und in der Prozessliste. Es gelten dieselben
Regeln wie bei der Registrierung, und in die Datenbank wandert nur der
Argon2-Hash. Absichtlich steht das Skript getrennt vom Seed: der Seed liegt im
Repository, ein Passwort hat dort nichts zu suchen.

Eine bereits vorhandene Adresse wird auf `SUPER_ADMIN` gehoben und behält ihre
Inserate und Nachrichten. Da `npm run db:seed` die Nutzertabelle leert, muss
das Skript nach jedem Seed-Lauf erneut laufen.

### Einnahmen und Monatsvergleich

Die Zahlungsseite im Verwaltungsbereich zeigt den laufenden Monat gegen den
Vormonat: Betrag, Unterschied in Euro und Prozent, Anzahl der Zahlungen,
Durchschnitt je Zahlung, offene Beträge, ein Zwölf-Monats-Verlauf und die
Aufschlüsselung, wofür bezahlt wurde.

Drei Rechenregeln stecken in `features/admin/revenue.ts` und sind dort ohne
Datenbank geprüft:

**Nur eingegangenes Geld zählt.** Offene und fehlgeschlagene Zahlungen bleiben
aus der Summe heraus; offene erscheinen als eigene Kennzahl.

**Erstattungen werden nicht verrechnet, sondern getrennt ausgewiesen.** Eine
Erstattung fällt oft in einen anderen Monat als die Zahlung. Stilles Verrechnen
liesse einen Monat schrumpfen, dessen Zahlen längst berichtet wurden.

**War der Vormonat null, gibt es keinen Prozentwert.** Statt „+100 %" steht
dort, dass ein Vergleich nicht möglich ist — aus null heraus lässt sich keine
prozentuale Steigerung bilden.

Monate ohne Einnahmen erscheinen im Diagramm als Null, nicht als Lücke, damit
kein Verlauf entsteht, den es nicht gab.

### Fehlermeldungen von Nutzern

`/report-bug` (`/raporto-gabim`, `/fehler-melden`) nimmt Meldungen über die
Seite selbst entgegen — nicht zu verwechseln mit dem Melden eines einzelnen
Inserats, das auf dem Inserat sitzt.

**Die Meldungen landen in der Datenbank und im Verwaltungsbereich unter
`/admin/bugs`, nicht per E-Mail.** In der Navigation steht die Zahl der offenen
Meldungen als Zeichen daneben, wie bei den Inseratsmeldungen. Jede lässt sich
auf *in Prüfung*, *behoben* oder *geschlossen* setzen, mit interner Notiz; wer
sie abgeschlossen hat und wann, wird festgehalten.

**Ohne Anmeldung möglich.** Wer über einen kaputten Anmeldevorgang stolpert,
kann sich nicht anmelden, um genau das zu melden — die wichtigste Meldung ginge
sonst verloren. Der Preis ist eine Begrenzung von zehn Meldungen je Stunde und
Absender.

Mitgeschickt wird der Zusammenhang, ohne den sich nichts nachstellen lässt:
die Seite, auf der es passiert ist (vorausgefüllt, aber sichtbar und änderbar),
die Browserkennung aus dem Anfragekopf und die Sprache. Angemeldete Melder
werden erkannt, ohne etwas eintragen zu müssen.

### Wie Verwalter in den Verwaltungsbereich kommen

Über das Kontomenü in der Kopfzeile, sichtbar nur für `ADMIN` und
`SUPER_ADMIN`. Nicht in der öffentlichen Navigation: ein Eintrag, der für alle
anderen mit 403 endet, ist keine Navigation. Der Wächter im Layout entscheidet
unabhängig davon — das Ausblenden ist Bequemlichkeit, kein Schutz.

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
- [x] **Phase 9** — Pakete und Zahlungen
- [x] **Phase 10** — KI-Funktionen
- [x] **Phase 11** — SEO, Geschwindigkeit, Sicherheit, End-zu-End-Tests
