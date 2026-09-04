import type { Metadata } from 'next';
import { BadgeCheck } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { DealerVerifyButton } from '@/features/admin/components/row-actions';
import { listDealersForAdmin } from '@/features/admin/queries';
import { formatDate } from '@/features/vehicles/format';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';

export const metadata: Metadata = { robots: { index: false } };

export default async function AdminDealersPage({
  params,
}: PageProps<'/[locale]/admin/dealers'>) {
  const { locale } = await params;
  const t = await getTranslations('admin.dealers');

  const dealers = await listDealersForAdmin();

  return (
    <div>
      <h2 className="text-lg font-semibold">{t('title')}</h2>

      <ul className="mt-4 space-y-2">
        {dealers.map((dealer) => (
          <li
            key={dealer.id}
            className="bg-card flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={{ pathname: '/dealer/[slug]', params: { slug: dealer.slug } }}
                  className="truncate font-semibold hover:underline"
                >
                  {dealer.companyName}
                </Link>
                {dealer.verification === 'VERIFIED' ? (
                  <span className="bg-success/10 text-success inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium">
                    <BadgeCheck className="size-3.5" aria-hidden />
                    {t('verified')}
                  </span>
                ) : (
                  <span className="bg-warning/15 text-warning-foreground dark:text-warning rounded-md px-2 py-0.5 text-xs font-medium">
                    {t('unverified')}
                  </span>
                )}
              </div>

              <p className="text-muted-foreground mt-1 text-sm">
                {dealer.city?.name ?? '—'} · {dealer._count.vehicles}
                {dealer.registrationNumber ? ` · ${dealer.registrationNumber}` : ''}
              </p>

              <p className="text-muted-foreground mt-1 text-xs">
                {t('owner')}: {dealer.user.name ?? dealer.user.email} ·{' '}
                {formatDate(dealer.createdAt, locale as Locale)}
              </p>
            </div>

            <DealerVerifyButton
              dealerId={dealer.id}
              verified={dealer.verification === 'VERIFIED'}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
