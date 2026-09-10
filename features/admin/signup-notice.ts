import { newSignupEmail } from '@/lib/email/templates';
import { EMAIL_FROM, sendEmail } from '@/lib/email';
import { prisma } from '@/lib/db';
import { siteConfig } from '@/lib/site';

/**
 * Sagt der Verwaltung Bescheid, wenn sich jemand registriert hat.
 *
 * Warum per Mail und nicht als Eintrag in der Benachrichtigungstabelle: dort
 * landen bereits zehn Arten von Meldungen, und keine Oberflaeche liest sie
 * aus. Eine elfte haette niemand gesehen. Eine Meldung, die niemand bekommt,
 * ist keine Meldung.
 *
 * Sichtbar ist der Zulauf zusaetzlich auf der Verwaltungsuebersicht -- das
 * wirkt auch dann, wenn der Mailversand noch nicht eingerichtet ist.
 */
export async function notifyAdminsOfSignup(signup: {
  name: string;
  email: string;
  dealer: string | null;
}): Promise<void> {
  const admins = await prisma.user.findMany({
    where: {
      role: { in: ['ADMIN', 'SUPER_ADMIN'] },
      status: 'ACTIVE',
      email: { not: null },
    },
    select: { email: true, locale: true },
  });

  if (admins.length === 0) return;

  const url = `${siteConfig.url}/admin/users`;

  // Nacheinander und einzeln abgesichert: faellt ein Postfach aus, sollen die
  // anderen Verwalter ihre Meldung trotzdem bekommen.
  for (const admin of admins) {
    if (!admin.email) continue;

    const locale = admin.locale === 'de' || admin.locale === 'en' ? admin.locale : 'sq';
    const template = newSignupEmail(locale, { ...signup, url });

    try {
      await sendEmail({
        to: admin.email,
        subject: template.subject,
        text: template.text,
        replyTo: EMAIL_FROM,
      });
    } catch (fehler) {
      console.error('  LEVIZ: Verwaltermeldung nicht zustellbar —', fehler);
    }
  }
}
