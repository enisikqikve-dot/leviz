import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '@/lib/generated/prisma/client';

/**
 * Prisma 7 verbindet ueber einen Treiber-Adapter statt ueber eine eingebaute
 * Engine. Dadurch haengt die Anwendung an einer gewoehnlichen
 * PostgreSQL-Verbindung — ein Wechsel auf eine andere Datenbank ist nur eine
 * Aenderung an DATABASE_URL.
 */
function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      'DATABASE_URL fehlt. Lege eine .env nach dem Vorbild von .env.example an.',
    );
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log:
      process.env.NODE_ENV === 'development'
        ? ['warn', 'error']
        : ['error'],
  });
}

// In der Entwicklung laedt Next.js Module bei jeder Aenderung neu. Ohne diesen
// Zwischenspeicher entstuende pro Neuladen ein weiterer Verbindungspool.
const globalForPrisma = globalThis as unknown as {
  levizPrisma?: PrismaClient;
};

/**
 * Der Client entsteht beim ersten Zugriff, nicht beim Laden des Moduls.
 *
 * Der Unterschied ist nicht kosmetisch: beim Bauen gibt es keine Datenbank —
 * im Container laeuft sie erst danach nebenan. Legte das Modul den Client
 * schon beim Import an, bräche `next build` an jeder Seite ab, die `prisma`
 * importiert, mit „DATABASE_URL fehlt". Die Anwendung waere ohne laufende
 * Datenbank nicht baubar, und das waere ein Fehler im Entwurf, kein
 * Docker-Problem.
 *
 * Die fehlende Adresse faellt weiterhin auf — nur eben bei der ersten Abfrage
 * statt beim Import, und dort gehoert sie hin.
 */
function resolveClient(): PrismaClient {
  globalForPrisma.levizPrisma ??= createPrismaClient();
  return globalForPrisma.levizPrisma;
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = resolveClient();
    const value = Reflect.get(client, property) as unknown;

    // Methoden brauchen ihren urspruenglichen Empfaenger, sonst verlieren
    // `$transaction` und Konsorten ihren Bezug.
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
