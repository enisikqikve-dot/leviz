import 'dotenv/config';

import { purgeExpiredDocuments } from '../features/verification/purge.js';
import { DOCUMENT_RETENTION_DAYS } from '../features/verification/schemas.js';
import { prisma } from '../lib/db/index.js';

/**
 * Löscht die Ausweisbelege entschiedener Anträge, deren Frist abgelaufen ist.
 *
 * Auf dem Server als tägliche Aufgabe eintragen:
 *
 *   30 3 * * * cd /root/leviz && docker compose run --rm migrate \
 *     npx tsx scripts/purge-verification.ts >> /var/log/leviz-purge.log 2>&1
 *
 * Der Verwaltungsbereich räumt beim Öffnen ebenfalls auf. Beides zusammen,
 * weil keins allein genügt: läuft die Zeitsteuerung nicht, sammeln sich
 * Ausweiskopien an, von denen niemand etwas ahnt — und schaut monatelang
 * niemand in die Verwaltung, ebenso.
 */
async function main() {
  const anzahl = await purgeExpiredDocuments();

  console.log(
    anzahl === 0
      ? `  Nichts zu loeschen. Belege verschwinden ${DOCUMENT_RETENTION_DAYS} Tage nach der Entscheidung.`
      : `  Belege von ${anzahl} entschiedenen Antraegen geloescht.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
