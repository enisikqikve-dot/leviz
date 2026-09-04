import { BadgeCheck, Clock, Globe, MapPin, Phone, Star } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { Button } from '@/components/ui/button';
import { InquiryDialog } from '@/features/inquiries/components/inquiry-dialog';
import { ContactSellerDialog } from '@/features/messages/components/contact-seller-dialog';
import { formatPhone } from '@/features/auth/phone';
import { formatDate } from '@/features/vehicles/format';
import type { VehicleDetail } from '@/features/vehicles/queries';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';

const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

/** Verkäuferbox mit den Handlungsaufrufen. Sie bleibt auf dem Desktop stehen. */
export async function SellerCard({
  vehicle,
  locale,
  viewer,
}: {
  vehicle: VehicleDetail;
  locale: Locale;
  viewer: { id: string; name?: string | null; email?: string | null } | null;
}) {
  const t = await getTranslations('vehicleDetail');
  const dealer = vehicle.dealer;
  const phone = dealer?.phone ?? vehicle.seller.phone;

  const hours =
    dealer?.openingHours && typeof dealer.openingHours === 'object'
      ? (dealer.openingHours as Record<string, string | null>)
      : null;

  return (
    <div className="bg-card text-card-foreground shadow-card rounded-xl border p-5">
      {dealer ? (
        <>
          <div className="flex items-start gap-2">
            <h2 className="min-w-0 flex-1 text-base font-semibold">{dealer.companyName}</h2>
            {dealer.verification === 'VERIFIED' ? (
              <span
                title={t('trust.verifiedDealer')}
                className="text-primary inline-flex shrink-0 items-center"
              >
                <BadgeCheck className="size-5" aria-hidden />
                <span className="sr-only">{t('trust.verifiedDealer')}</span>
              </span>
            ) : null}
          </div>

          {dealer.ratingCount > 0 ? (
            <p className="mt-2 flex items-center gap-1.5 text-sm">
              <Star className="text-featured size-4 fill-current" aria-hidden />
              <span className="font-semibold">{dealer.ratingAvg.toFixed(1)}</span>
              <span className="text-muted-foreground text-xs">
                {t('seller.reviews', { count: dealer.ratingCount })}
              </span>
            </p>
          ) : null}

          <p className="text-muted-foreground mt-2 text-sm">
            {t('seller.vehiclesAvailable', { count: dealer._count.vehicles })}
          </p>

          {dealer.city ? (
            <p className="text-muted-foreground mt-3 inline-flex items-start gap-1.5 text-sm">
              <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                {dealer.addressLine ? `${dealer.addressLine}, ` : ''}
                {dealer.postalCode ? `${dealer.postalCode} ` : ''}
                {dealer.city.name}
              </span>
            </p>
          ) : null}
        </>
      ) : (
        <>
          <h2 className="text-base font-semibold">
            {vehicle.seller.name ?? t('seller.private')}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">{t('seller.private')}</p>
          <p className="text-muted-foreground mt-3 text-xs">
            {t('seller.memberSince')} {formatDate(vehicle.seller.createdAt, locale)}
          </p>
        </>
      )}

      <div className="mt-5 space-y-2">
        {/*
          Angemeldete Nutzer schreiben direkt in den internen Austausch; ohne
          Anmeldung bleibt das Anfrageformular, damit niemand vor einer
          Registrierung steht, nur um eine Frage zu stellen.
        */}
        {viewer && viewer.id !== vehicle.sellerId ? (
          <ContactSellerDialog vehicleId={vehicle.id} />
        ) : (
          <InquiryDialog
            vehicleId={vehicle.id}
            defaultName={viewer?.name}
            defaultEmail={viewer?.email}
          />
        )}

        {phone ? (
          <Button asChild variant="outline" size="lg" className="h-11 w-full">
            {/* Telefonisch wird in der Region am häufigsten Kontakt aufgenommen. */}
            <a href={`tel:${phone}`}>
              <Phone className="size-4" aria-hidden />
              {formatPhone(phone)}
            </a>
          </Button>
        ) : null}
      </div>

      {dealer ? (
        <div className="mt-5 space-y-3 border-t pt-4">
          {hours ? (
            <details className="text-sm">
              <summary className="text-muted-foreground inline-flex cursor-pointer items-center gap-1.5">
                <Clock className="size-4" aria-hidden />
                {t('seller.openingHours')}
              </summary>
              <dl className="mt-2 space-y-1">
                {WEEKDAYS.map((day) => (
                  <div key={day} className="flex justify-between gap-4 text-xs">
                    <dt className="text-muted-foreground uppercase">{day}</dt>
                    <dd className="font-medium">{hours[day] ?? '—'}</dd>
                  </div>
                ))}
              </dl>
            </details>
          ) : null}

          {dealer.website ? (
            <a
              href={dealer.website}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
            >
              <Globe className="size-4" aria-hidden />
              {t('seller.website')}
            </a>
          ) : null}

          <Link
            href={{ pathname: '/dealer/[slug]', params: { slug: dealer.slug } }}
            className="text-primary block text-sm font-medium hover:underline"
          >
            {t('seller.viewProfile')}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
