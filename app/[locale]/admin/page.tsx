import type { Metadata } from 'next';
import {
  AlertTriangle, Car, CheckCircle2, Clock, Flag, ShieldAlert, Store, Tag, Users,
} from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { getPlatformStats } from '@/features/admin/queries';
import { StatCard } from '@/features/dealers/components/stat-card';
import { formatNumber } from '@/lib/currency';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';

export const metadata: Metadata = { robots: { index: false } };

export default async function AdminDashboardPage({
  params,
}: PageProps<'/[locale]/admin'>) {
  const { locale } = await params;
  const t = await getTranslations('admin.stats');
  const tn = await getTranslations('admin.nav');

  const stats = await getPlatformStats();
  const number = (value: number) => formatNumber(value, locale as Locale);

  return (
    <div className="space-y-8">
      {/* Was Aufmerksamkeit braucht, steht oben und ist anklickbar. */}
      {stats.pendingReview > 0 || stats.openReports > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {stats.pendingReview > 0 ? (
            <Link
              href="/admin/vehicles"
              className="border-warning/40 bg-warning/10 hover:bg-warning/15 flex items-center gap-4 rounded-xl border p-5 transition-colors"
            >
              <Clock className="text-warning size-8 shrink-0" aria-hidden />
              <div>
                <p className="text-2xl font-semibold">{number(stats.pendingReview)}</p>
                <p className="text-sm">{t('pendingReview')}</p>
              </div>
            </Link>
          ) : null}

          {stats.openReports > 0 ? (
            <Link
              href="/admin/reports"
              className="border-destructive/40 bg-destructive/10 hover:bg-destructive/15 flex items-center gap-4 rounded-xl border p-5 transition-colors"
            >
              <ShieldAlert className="text-destructive size-8 shrink-0" aria-hidden />
              <div>
                <p className="text-2xl font-semibold">{number(stats.openReports)}</p>
                <p className="text-sm">{t('openReports')}</p>
              </div>
            </Link>
          ) : null}
        </div>
      ) : (
        <p className="text-success bg-success/10 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium">
          <CheckCircle2 className="size-4" aria-hidden />
          {tn('dashboard')}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label={t('totalVehicles')} value={number(stats.totalVehicles)} icon={Car} />
        <StatCard label={t('activeListings')} value={number(stats.activeListings)} icon={CheckCircle2} />
        <StatCard label={t('soldListings')} value={number(stats.soldListings)} icon={Tag} />
        <StatCard label={t('newThisWeek')} value={number(stats.newThisWeek)} icon={Flag} />
        <StatCard label={t('totalUsers')} value={number(stats.totalUsers)} icon={Users} />
        <StatCard label={t('totalDealers')} value={number(stats.totalDealers)} icon={Store} />
        <StatCard
          label={t('unverifiedDealers')}
          value={number(stats.unverifiedDealers)}
          icon={AlertTriangle}
        />
      </div>
    </div>
  );
}
