import type { Metadata } from 'next';
import {
  AlertTriangle, Car, CheckCircle2, Clock, Flag, ShieldAlert, Store, Tag, UserPlus, Users,
} from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { getPlatformStats, getRecentSignups } from '@/features/admin/queries';
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

  const [stats, signups] = await Promise.all([getPlatformStats(), getRecentSignups()]);
  const number = (value: number) => formatNumber(value, locale as Locale);

  const ts = await getTranslations('admin.signups');
  const wann = new Intl.DateTimeFormat(locale === 'sq' ? 'sq-AL' : locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

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
        <StatCard
          label={t('newUsersThisWeek')}
          value={number(stats.newUsersThisWeek)}
          icon={UserPlus}
        />
      </div>

      {/*
        Wer sich zuletzt registriert hat, steht hier mit Namen.

        Gemeldet wird zusaetzlich per Mail an die Verwalter -- aber eine Mail
        kommt nur an, solange der Versand eingerichtet ist. Diese Liste wirkt
        immer, und sie steht dort, wo die Verwaltung ohnehin hinschaut.
      */}
      <section className="bg-card rounded-xl border">
        <div className="flex items-center justify-between gap-4 border-b px-5 py-4">
          <h2 className="text-base font-semibold">{ts('title')}</h2>
          <Link href="/admin/users" className="text-primary text-sm font-medium hover:underline">
            {ts('all')}
          </Link>
        </div>

        {signups.length === 0 ? (
          <p className="text-muted-foreground px-5 py-8 text-center text-sm">{ts('empty')}</p>
        ) : (
          <ul className="divide-y">
            {signups.map((person) => (
              <li key={person.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3">
                <span className="min-w-0 flex-1">
                  <Link
                    href={{ pathname: '/admin/users/[id]', params: { id: person.id } }}
                    className="truncate text-sm font-medium hover:underline"
                  >
                    {person.dealer?.companyName ?? person.name ?? person.email}
                  </Link>
                  <span className="text-muted-foreground block truncate text-xs">
                    {person.email}
                  </span>
                </span>

                <span
                  className={
                    person.dealer
                      ? 'bg-primary/10 text-primary rounded-md px-2 py-0.5 text-xs font-medium'
                      : 'bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-xs font-medium'
                  }
                >
                  {person.dealer ? ts('dealer') : ts('private')}
                </span>

                <span className="text-muted-foreground text-xs">
                  {wann.format(person.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
