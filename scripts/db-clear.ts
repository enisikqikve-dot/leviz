/**
 * Entfernt erfundene Inhalte aus einer Datenbank, die schon befüllt ist.
 *
 * Was verschwindet: Fahrzeuge samt Bildern, Autohäuser, Bewertungen,
 * Nachrichten, Meldungen, Zahlungen — und alle Nutzerkonten ausser den
 * verwaltenden. Das ist alles, was der Seed erfunden hat.
 *
 * Was bleibt: der Katalog. Länder, Städte, Marken, Modelle, Ausstattung,
 * Pakete und Grundeinstellungen sind echte Nachschlagewerke, keine Angebote.
 * Ohne sie liesse sich kein einziges Inserat anlegen.
 *
 * Verwaltende Konten bleiben ebenfalls, sonst sperrte dieser Befehl den
 * Betreiber aus der eigenen Anwendung aus.
 *
 * Aufruf:
 *   npm run db:clear -- --ja
 *
 * Die Bestätigung ist Absicht: der Befehl ist nicht umkehrbar.
 */
import 'dotenv/config';

import { prisma } from '../lib/db/index.js';

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN'] as const;

async function zaehle() {
  const [vehicles, dealers, users, admins] = await Promise.all([
    prisma.vehicle.count(),
    prisma.dealer.count(),
    prisma.user.count({ where: { role: { notIn: [...ADMIN_ROLES] } } }),
    prisma.user.count({ where: { role: { in: [...ADMIN_ROLES] } } }),
  ]);
  return { vehicles, dealers, users, admins };
}

async function main() {
  const bestaetigt = process.argv.includes('--ja');
  const vorher = await zaehle();

  console.log('');
  console.log(`  Fahrzeuge:            ${vorher.vehicles}`);
  console.log(`  Autohäuser:           ${vorher.dealers}`);
  console.log(`  Nutzerkonten:         ${vorher.users}`);
  console.log(`  Verwaltende (bleiben): ${vorher.admins}`);
  console.log('');

  if (!bestaetigt) {
    console.log('  Nichts geändert. Zum Ausführen:');
    console.log('    npm run db:clear -- --ja');
    console.log('');
    console.log('  Der Katalog (Marken, Modelle, Städte, Pakete) bleibt erhalten.');
    console.log('');
    return;
  }

  // Reihenfolge nach Abhängigkeiten: erst was auf Fahrzeuge zeigt, dann die
  // Fahrzeuge, dann die Konten. Fahrzeuge tragen einen Verweis auf den
  // moderierenden Verwalter — sie müssen vor den Konten fallen.
  await prisma.$transaction([
    prisma.message.deleteMany(),
    prisma.conversation.deleteMany(),
    prisma.listingInquiry.deleteMany(),
    prisma.listingView.deleteMany(),
    prisma.favorite.deleteMany(),
    prisma.report.deleteMany(),
    prisma.priceHistory.deleteMany(),
    prisma.vehicleFeature.deleteMany(),
    prisma.vehicleImage.deleteMany(),
    prisma.vehicle.deleteMany(),

    prisma.review.deleteMany(),
    prisma.dealerVerification.deleteMany(),
    prisma.dealer.deleteMany(),

    prisma.notification.deleteMany(),
    prisma.savedSearch.deleteMany(),
    prisma.searchHistory.deleteMany(),
    prisma.priceEstimate.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.subscription.deleteMany(),
    prisma.passwordResetToken.deleteMany(),
    prisma.phoneVerification.deleteMany(),

    // Profile, Sitzungen und verknüpfte Anmeldungen hängen am Konto und
    // verschwinden mit ihm (onDelete: Cascade).
    prisma.user.deleteMany({ where: { role: { notIn: [...ADMIN_ROLES] } } }),
  ]);

  const nachher = await zaehle();

  console.log('  Erledigt.');
  console.log('');
  console.log(`  Fahrzeuge:    ${nachher.vehicles}`);
  console.log(`  Autohäuser:   ${nachher.dealers}`);
  console.log(`  Nutzerkonten: ${nachher.users} (+ ${nachher.admins} verwaltende)`);
  console.log('');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
