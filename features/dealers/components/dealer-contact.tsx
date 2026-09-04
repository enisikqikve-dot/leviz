import { Clock, Globe, Mail, Phone } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { Button } from '@/components/ui/button';
import { formatPhone } from '@/features/auth/phone';

const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

/** Kontaktdaten und Öffnungszeiten. Bleibt auf dem Desktop stehen. */
export async function DealerContact({
  phone, email, website, openingHours,
}: {
  phone: string | null;
  email: string | null;
  website: string | null;
  openingHours: unknown;
}) {
  const t = await getTranslations('dealerProfile');

  const hours =
    openingHours && typeof openingHours === 'object'
      ? (openingHours as Record<string, string | null>)
      : null;

  return (
    <aside className="bg-card shadow-card mt-8 rounded-xl border p-5 lg:sticky lg:top-20 lg:mt-0">
      <h2 className="text-sm font-semibold">{t('contact')}</h2>

      <div className="mt-4 space-y-3">
        {phone ? (
          <Button asChild variant="outline" size="lg" className="h-11 w-full justify-start">
            <a href={`tel:${phone}`}>
              <Phone className="size-4" aria-hidden />
              {formatPhone(phone)}
            </a>
          </Button>
        ) : null}

        {email ? (
          <Button asChild variant="outline" size="lg" className="h-11 w-full justify-start">
            <a href={`mailto:${email}`}>
              <Mail className="size-4" aria-hidden />
              <span className="truncate">{email}</span>
            </a>
          </Button>
        ) : null}

        {website ? (
          <Button asChild variant="outline" size="lg" className="h-11 w-full justify-start">
            <a href={website} target="_blank" rel="noopener noreferrer nofollow">
              <Globe className="size-4" aria-hidden />
              <span className="truncate">{website.replace(/^https?:\/\//, '')}</span>
            </a>
          </Button>
        ) : null}
      </div>

      {hours ? (
        <div className="mt-6 border-t pt-4">
          <h3 className="text-muted-foreground inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
            <Clock className="size-3.5" aria-hidden />
            {t('openingHours')}
          </h3>
          <dl className="mt-3 space-y-1.5">
            {WEEKDAYS.map((day) => (
              <div key={day} className="flex justify-between gap-4 text-sm">
                <dt className="text-muted-foreground uppercase">{day}</dt>
                <dd className="font-medium">{hours[day] ?? t('closed')}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
    </aside>
  );
}
