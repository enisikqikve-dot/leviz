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
npm run db:seed
```

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
| `npm run db:seed` | Beispieldaten einspielen |
| `npm run db:studio` | Prisma Studio öffnen |
| `npm run admin:create` | Verwalterkonto anlegen oder hochstufen |
| `npm run db:reset` | Datenbank zurücksetzen und neu befüllen |
| `npm run brand:avatar` | Profilbilder für soziale Netzwerke erzeugen |
| `npm run brand:social` | Beitragsbilder für soziale Netzwerke erzeugen |
| `npm run brand:shots` | Seiten in Telefonformat aufnehmen (Chrome nötig) |
| `npm run brand:video` | 20-Sekunden-Video aus den Aufnahmen bauen (ffmpeg nötig) |

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
