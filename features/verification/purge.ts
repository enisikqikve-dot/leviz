import { prisma } from '@/lib/db';
import { removeDocument } from '@/lib/storage/private-store';

import { DOCUMENT_RETENTION_DAYS } from './schemas';

const TAG_IN_MS = 24 * 60 * 60 * 1000;

/**
 * Ab wann ein entschiedener Antrag seine Belege verliert.
 *
 * Eigene Funktion, damit sich die Frist prüfen lässt, ohne eine Datenbank zu
 * brauchen — bei einer Aufräumroutine ist die Grenze der einzige Teil, der
 * wirklich falsch sein kann.
 */
export function purgeCutoff(now: Date, days: number = DOCUMENT_RETENTION_DAYS): Date {
  return new Date(now.getTime() - days * TAG_IN_MS);
}

/**
 * Löscht die Belege entschiedener Anträge, deren Frist abgelaufen ist.
 *
 * Erst die Datei, dann die Zeile: bricht es dazwischen ab, steht in der
 * Datenbank noch ein Verweis auf eine fehlende Datei — unschön, aber harmlos.
 * Andersherum bliebe eine Ausweiskopie liegen, auf die nichts mehr zeigt und
 * die niemand mehr findet.
 */
export async function purgeExpiredDocuments(now: Date = new Date()): Promise<number> {
  const faellig = await prisma.verificationRequest.findMany({
    where: {
      status: { in: ['VERIFIED', 'REJECTED'] },
      reviewedAt: { lt: purgeCutoff(now) },
      documentsPurgedAt: null,
    },
    select: { id: true, documents: { select: { storageKey: true } } },
  });

  for (const antrag of faellig) {
    for (const beleg of antrag.documents) {
      await removeDocument(beleg.storageKey);
    }

    await prisma.$transaction([
      prisma.verificationDocument.deleteMany({ where: { requestId: antrag.id } }),
      prisma.verificationRequest.update({
        where: { id: antrag.id },
        data: { documentsPurgedAt: now },
      }),
    ]);
  }

  return faellig.length;
}
