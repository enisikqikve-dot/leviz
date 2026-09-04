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

export const prisma: PrismaClient =
  globalForPrisma.levizPrisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.levizPrisma = prisma;
}
