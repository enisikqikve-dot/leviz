#!/usr/bin/env bash
#
# Taegliche Sicherung von LEVIZ: Datenbank und hochgeladene Fotos.
#
# Einmalig einrichten, auf dem Server:
#
#   chmod +x ~/leviz/docker/backup.sh
#   ~/leviz/docker/backup.sh
#   crontab -e
#
# und in der geoeffneten Datei eine Zeile anfuegen -- jede Nacht um 3:15 Uhr:
#
#   15 3 * * * /root/leviz/docker/backup.sh >> /var/log/leviz-backup.log 2>&1
#
# ZURUECKSPIELEN, Datenbank (ersetzt den aktuellen Stand vollstaendig):
#
#   cd ~/leviz
#   gunzip -c ~/leviz-sicherung/db-2026-09-06.sql.gz \
#     | docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
#
# ZURUECKSPIELEN, Fotos (legt fehlende Dateien zurueck, ueberschreibt gleiche):
#
#   cd ~/leviz
#   docker compose exec -T app tar -xzf - -C /app/public/uploads \
#     < ~/leviz-sicherung/fotos-2026-09-06.tar.gz
#
# WAS DIESE SICHERUNG NICHT ABDECKT: den Verlust des Servers selbst. Sie liegt
# auf derselben Platte. Sie rettet vor dem falschen Befehl, vor einer
# missglueckten Aenderung und vor geloeschten Daten -- nicht vor einem
# Totalausfall. Dafuer die Dateien regelmaessig herunterladen, vom eigenen
# Rechner aus:
#
#   scp root@levizz.com:'~/leviz-sicherung/*.gz' .

set -euo pipefail

# Nur der Eigentuemer darf die Sicherungen lesen. Der Abzug enthaelt jede
# Adresse, jede Telefonnummer und jeden Passwort-Hash der Nutzer -- er ist so
# schuetzenswert wie die Datenbank selbst.
umask 077

cd "$(dirname "$0")/.."

ZIEL="${LEVIZ_BACKUP_DIR:-$HOME/leviz-sicherung}"
TAGE="${LEVIZ_BACKUP_DAYS:-14}"
STAND="$(date +%F)"

DB_DATEI="$ZIEL/db-$STAND.sql.gz"
FOTO_DATEI="$ZIEL/fotos-$STAND.tar.gz"

mkdir -p "$ZIEL"
chmod 700 "$ZIEL"

meldung() { printf '%s  %s\n' "$(date +'%F %T')" "$1"; }

# --- Datenbank ---------------------------------------------------------------
#
# Nutzername und Datenbankname stehen in der Umgebung des Behaelters selbst.
# Die .env hier einzulesen waere gefaehrlich: eine Zeile wie
# EMAIL_FROM=LEVIZ <info@levizz.com> liest die Shell als Umleitung.
meldung "Datenbank wird gesichert"

docker compose exec -T db sh -c \
  'pg_dump --no-owner --clean --if-exists -U "$POSTGRES_USER" "$POSTGRES_DB"' \
  | gzip -9 > "$DB_DATEI"

# Eine abgebrochene Sicherung ist schlimmer als gar keine: sie sieht aus wie
# eine. Deshalb wird jede Datei geprueft, bevor der Lauf als gelungen gilt.
gzip -t "$DB_DATEI"

if [ "$(stat -c %s "$DB_DATEI")" -lt 1024 ]; then
  meldung "FEHLER: die Datenbanksicherung ist verdaechtig klein -- nicht verwenden"
  exit 1
fi

# --- Fotos -------------------------------------------------------------------
meldung "Fotos werden gesichert"

if ! docker compose exec -T app sh -c 'command -v tar > /dev/null'; then
  meldung "FEHLER: im Anwendungscontainer fehlt tar -- Fotos nicht gesichert"
  exit 1
fi

docker compose exec -T app tar -czf - -C /app/public/uploads . > "$FOTO_DATEI"
gzip -t "$FOTO_DATEI"

# --- Alte Staende aufraeumen --------------------------------------------------
#
# Mehrere Tage, nicht nur einer: ein geloeschtes Inserat faellt selten am
# selben Tag auf. Eine Sicherung, die den Fehler schon mitgeschrieben hat,
# nuetzt nichts.
find "$ZIEL" -maxdepth 1 -name 'db-*.sql.gz'    -mtime "+$((TAGE - 1))" -delete
find "$ZIEL" -maxdepth 1 -name 'fotos-*.tar.gz' -mtime "+$((TAGE - 1))" -delete

meldung "fertig: Datenbank $(du -h "$DB_DATEI" | cut -f1), Fotos $(du -h "$FOTO_DATEI" | cut -f1), $TAGE Tage bleiben liegen"
