import 'dotenv/config';

import { EMAIL_FROM, getEmailProvider, readSmtpSettings } from '../lib/email/index.js';

/**
 * Schickt eine Testmail über den eingerichteten Weg und sagt genau, was passiert.
 *
 * Warum es dieses Skript gibt: „Die Mail kommt nicht an" hat vier mögliche
 * Ursachen, und von aussen sieht man keine davon. Die Seite antwortet mit
 * Absicht immer gleich — sonst liesse sich darüber herausfinden, welche
 * Adressen registriert sind. Ohne dieses Skript bleibt nur Raten.
 *
 * Auf dem Server:
 *
 *   cd ~/leviz
 *   docker compose run --rm migrate npx tsx scripts/email-test.ts du@example.com
 */
async function main() {
  const empfaenger = process.argv[2];

  if (!empfaenger || !empfaenger.includes('@')) {
    console.error('  Aufruf: npx tsx scripts/email-test.ts adresse@beispiel.com');
    process.exitCode = 1;
    return;
  }

  const driver = process.env.EMAIL_DRIVER ?? 'console';

  console.log('');
  console.log('  Eingerichteter Weg:', driver);
  console.log('  Absender:          ', EMAIL_FROM);

  if (driver === 'console') {
    console.log('');
    console.log('  PROBEMODUS. Es wird nichts verschickt — die Mail landet nur hier');
    console.log('  im Protokoll. Kunden bekommen davon nichts.');
    console.log('');
    console.log('  In der .env auf "smtp" stellen und die vier SMTP_-Werte setzen,');
    console.log('  danach: docker compose up -d app');
  }

  if (driver === 'smtp') {
    const settings = readSmtpSettings(process.env);

    if (!settings.ok) {
      console.error('');
      console.error('  Es fehlen:', settings.missing.join(', '));
      process.exitCode = 1;
      return;
    }

    console.log('  Server:            ', `${settings.settings.host}:${settings.settings.port}`);
    console.log('  Postfach:          ', settings.settings.user);
  }

  console.log('');
  console.log('  Sende an', empfaenger, '…');

  try {
    const ergebnis = await getEmailProvider().send({
      to: empfaenger,
      subject: 'LEVIZ — Testmail',
      text:
        'Diese Nachricht bestaetigt, dass der Mailversand von LEVIZ funktioniert.\n\n' +
        'Kommt sie an, kommen auch die Links zum Zuruecksetzen des Passworts an.',
    });

    console.log('');
    console.log('  Angenommen. Kennung:', ergebnis.id ?? '—');

    if (driver === 'smtp') {
      console.log('');
      console.log('  Schau jetzt ins Postfach, auch in den Spam-Ordner. Liegt sie dort,');
      console.log('  fehlen DKIM und ein gueltiger DMARC-Eintrag in der DNS-Zone.');
    } else {
      console.log('');
      console.log('  Das war nur das Protokoll. Verschickt wurde nichts.');
    }
  } catch (fehler) {
    console.error('');
    console.error('  FEHLGESCHLAGEN.');
    console.error('  ', fehler instanceof Error ? fehler.message : String(fehler));
    console.error('');
    console.error('  Haeufige Ursachen:');
    console.error('   - das Postfach gibt es bei Hostinger noch gar nicht');
    console.error('   - falsches Postfach-Passwort in SMTP_PASSWORD');
    console.error('   - EMAIL_FROM zeigt auf eine andere Domaene als SMTP_USER');
    console.error('   - Port 465 ist vom Server aus gesperrt');
    process.exitCode = 1;
  }
}

main();
