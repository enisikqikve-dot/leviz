#!/bin/sh
set -e

# Migrationen vor dem Start.
#
# `migrate deploy` wendet nur an, was noch fehlt, und erzeugt selbst keine
# neuen Migrationen -- das ist die Fassung fuer den Betrieb. Faellt sie durch,
# wird der Server gar nicht erst gestartet: eine Anwendung, die gegen ein
# veraltetes Schema laeuft, richtet mehr Schaden an als eine, die steht.
echo "  Migrationen anwenden ..."
node node_modules/prisma/build/index.js migrate deploy

echo "  LEVIZ startet auf Port ${PORT:-3000}"
exec "$@"
