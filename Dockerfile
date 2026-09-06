# LEVIZ als Abbild.
#
# Drei Stufen, damit im Betrieb nur landet, was tatsaechlich laeuft: die
# Abhaengigkeiten zum Bauen bleiben zurueck, das fertige Abbild enthaelt den
# eigenstaendigen Server aus `output: 'standalone'`.
#
# Debian statt Alpine mit voller Absicht: Prisma und @node-rs/argon2 bringen
# vorkompilierte Teile mit, und die fuer Alpines musl-Bibliothek sind eine
# eigene Fehlerquelle. Die paar Megabyte mehr sind das nicht wert.

# --- Stufe 1: Abhaengigkeiten -------------------------------------------------
FROM node:24-slim AS deps

WORKDIR /app

# Prisma erzeugt beim Installieren seinen Client (postinstall) und braucht
# dafuer OpenSSL.
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

# Erst die Manifeste kopieren: solange sie sich nicht aendern, benutzt Docker
# die zwischengespeicherte Installation wieder.
COPY package.json package-lock.json ./
COPY prisma ./prisma

RUN npm ci

# --- Stufe 2: Bauen -----------------------------------------------------------
FROM node:24-slim AS build

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Den Prisma-Client hier erzeugen, nicht aus der ersten Stufe uebernehmen.
#
# lib/generated/ steht in .gitignore und .dockerignore -- es kommt also weder
# aus dem Repository noch aus dem Bau-Kontext. Die erste Stufe erzeugt es zwar
# beim Installieren (postinstall), aber dort bleibt es liegen: kopiert wird von
# dort nur node_modules. Ohne diese Zeile findet der Next-Build den Import in
# lib/db/index.ts nicht und bricht mit "module not found" ab.
RUN npx prisma generate

# Diese Adresse steckt im Build: aus ihr entstehen kanonische Adressen,
# hreflang und die Sitemap. Sie muss beim Bauen bekannt sein, nicht erst beim
# Start -- deshalb ein Build-Argument.
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# --- Stufe 3: Betrieb ---------------------------------------------------------
FROM node:24-slim AS runner

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Nicht als root laufen. Ein Einbruch ueber die Anwendung soll nicht gleich
# den ganzen Behaelter gehoeren.
RUN groupadd --system --gid 1001 leviz \
  && useradd --system --uid 1001 --gid leviz leviz

# Der eigenstaendige Server samt seiner Abhaengigkeiten.
COPY --from=build --chown=leviz:leviz /app/.next/standalone ./
COPY --from=build --chown=leviz:leviz /app/.next/static ./.next/static
COPY --from=build --chown=leviz:leviz /app/public ./public

# Fuer die Migrationen beim Start: Prisma und das Schema.
COPY --from=build --chown=leviz:leviz /app/prisma ./prisma
COPY --from=build --chown=leviz:leviz /app/node_modules/prisma ./node_modules/prisma
COPY --from=build --chown=leviz:leviz /app/node_modules/@prisma ./node_modules/@prisma

# Der erzeugte Prisma-Client. Die eigenstaendige Ausgabe zieht ihn ueblicherweise
# selbst mit; ausdruecklich kopiert kostet er nichts und erspart im Zweifel
# einen Fehlschlag erst zur Laufzeit.
COPY --from=build --chown=leviz:leviz /app/lib/generated ./lib/generated

COPY --chown=leviz:leviz docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Hochgeladene Fotos. Auf einem einzelnen Server reicht die Festplatte; das
# Verzeichnis haengt in docker-compose.yml an einem dauerhaften Speicher,
# sonst waeren die Bilder nach jedem Neustart weg.
RUN mkdir -p /app/public/uploads && chown leviz:leviz /app/public/uploads

# Ausweisbelege. Eigenes Verzeichnis ausserhalb von public/, damit sie nicht
# ueber ihre Adresse abrufbar sind; auch hier haengt ein dauerhafter Speicher.
RUN mkdir -p /app/var/verification && chown -R leviz:leviz /app/var

USER leviz
EXPOSE 3000

ENTRYPOINT ["entrypoint.sh"]
CMD ["node", "server.js"]
