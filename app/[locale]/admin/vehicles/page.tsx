import type { Metadata } from 'next';
import { CheckCircle2 } from 'lucide-react';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';

import { ModerationActions } from '@/features/admin/components/moderation-actions';
import { getPendingVehicles } from '@/features/admin/queries';
import { getEurToAllRate } from '@/features/search/data';
import { formatDate } from '@/features/vehicles/format';
import { formatPrice } from '@/lib/currency';
import { getCurrency } from '@/lib/currency-server';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';

export const metadata: Metadata = { robots: { index: false } };

export default async function AdminVehiclesPage({
  params,
}: PageProps<'/[locale]/admin/vehicles'>) {
  const { locale } = await params;
  const t = await getTranslations('admin.vehicles');
  const tf = await getTranslations('admin.flags');

  const [vehicles, currency, eurToAll] = await Promise.all([
    getPendingVehicles(),
    getCurrency(),
    getEurToAllRate(),
  ]);

  return (
    <div>
      <h2 className="text-lg font-semibold">{t('pendingTitle')}</h2>

      {vehicles.length === 0 ? (
        <div className="bg-surface mt-4 flex flex-col items-center rounded-xl border px-6 py-16 text-center">
          <span className="bg-success/10 text-success inline-flex size-14 items-center justify-center rounded-full">
            <CheckCircle2 className="size-7" aria-hidden />
          </span>
          <p className="mt-5 font-semibold">{t('noPending')}</p>
          <p className="text-muted-foreground mt-2 text-sm">{t('noPendingHint')}</p>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {vehicles.map((vehicle) => {
            const flags = vehicle.flaggedReason?.split(',').filter(Boolean) ?? [];

            return (
              <li key={vehicle.id} className="bg-card rounded-xl border p-4">
                <div className="flex flex-col gap-4 sm:flex-row">
                  <div className="bg-muted relative h-24 w-full shrink-0 overflow-hidden rounded-lg sm:h-20 sm:w-28">
                    {vehicle.images[0] ? (
                      <Image src={vehicle.images[0].url} alt="" fill sizes="112px" className="object-cover" />
                    ) : null}
                  </div>

                  <div className="min-w-0 flex-1">
                    <Link
                      href={{ pathname: '/vehicle/[slug]', params: { slug: vehicle.slug } }}
                      className="font-semibold hover:underline"
                    >
                      {vehicle.brand.name} {vehicle.model.name}
                    </Link>

                    <p className="text-muted-foreground mt-1 text-sm">
                      {formatPrice(vehicle.priceCents, {
                        currency, locale: locale as Locale, eurToAll,
                      })}
                      {' · '}
                      {vehicle._count.images} · {vehicle.qualityScore}%
                    </p>

                    <p className="text-muted-foreground mt-1 text-xs">
                      {t('seller')}:{' '}
                      {vehicle.dealer?.companyName ?? vehicle.seller.name ?? vehicle.seller.email}
                      {' · '}
                      {formatDate(vehicle.createdAt, locale as Locale)}
                    </p>

                    {flags.length > 0 ? (
                      <ul className="mt-3 flex flex-wrap gap-1.5">
                        {flags.map((flag) => (
                          <li
                            key={flag}
                            className="bg-warning/15 text-warning-foreground dark:text-warning rounded-md px-2 py-0.5 text-xs font-medium"
                          >
                            {tf.has(flag) ? tf(flag) : flag}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground mt-3 text-xs">{t('noFlags')}</p>
                    )}
                  </div>

                  <div className="shrink-0 sm:w-56">
                    <ModerationActions vehicleId={vehicle.id} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
