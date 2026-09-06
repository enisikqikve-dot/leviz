#!/bin/sh
set -e

# Der Anwendungscontainer wendet keine Migrationen an.
#
# Das schlanke Betriebs-Abbild enthaelt nur, was zum Laufen noetig ist. Der
# Prisma-Befehl bringt eine eigene Kette von Abhaengigkeiten mit, die dort
# fehlt -- sie alle nachzukopieren waere ein Fass ohne Boden.
#
# Stattdessen laeuft "prisma migrate deploy" als eigener Dienst "migrate" aus
# der Bau-Stufe, in der ohnehin alles liegt. docker-compose.yml startet die
# Anwendung erst, wenn dieser Dienst erfolgreich beendet ist.

echo "  LEVIZ startet auf Port ${PORT:-3000}"
exec "$@"
