import type { Metadata } from 'next';
import { ArrowLeft, ShieldOff } from 'lucide-react';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { ResetPasswordButton } from '@/features/admin/components/reset-password-button';
import { UserSuspendButton } from '@/features/admin/components/row-actions';
import { getUserForAdmin, listPaymentsForUser } from '@/features/admin/queries';
import { formatPhone } from '@/features/auth/phone';
import { isFeaturePayment, paymentSubject } from '@/features/packages/label';
import { getEurToAllRate } from '@/features/search/data';
import { requireAdmin } from '@/lib/auth/guards';
import { formatPrice } from '@/lib/currency';
import { getCurrency } from '@/lib/currency-server';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { robots: { index: false } };

const STATUS_TONE: Record<string, string> = {
  ACTIVE: 'bg-success/10 text-success',
  SUSPENDED: 'bg-destructive/10 text-destructive',
  DELETED: 'bg-muted text-muted-foreground',
};

export default async function AdminUserPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;

  const admin = await requireAdmin();
  const t = await getTranslations('admin.userDetail');
  const td = await getTranslations('dashboard');
  const tv = await getTranslations('vehicle');

  const [user, payments, currency, eurToAll] = await Promise.all([
    getUserForAdmin(id),
    listPaymentsForUser(id),
    getCurrency(),
    getEurToAllRate(),
  ]);

  if (!user) notFound();

  const price = (cents: number) =>
    formatPrice(cents, { currency, locale: locale as Locale, eurToAll, withCents: true });

  const date = (value: Date | null) =>
    value
      ? new Intl.DateTimeFormat(locale === 'sq' ? 'sq-AL' : locale, {
          dateStyle: 'medium',
        }).format(value)
      : '—';

  const isPrivileged = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';

  const facts: [string, string][] = [
    [t('email'), user.email ?? '—'],
    [t('phone'), user.phone ? formatPhone(user.phone) : '—'],
    [t('city'), user.profile?.city ? `${user.profile.city.name} (${user.profile.city.country.code})` : '—'],
    [t('language'), user.locale],
    [t('joined'), date(user.createdAt)],
    [t('lastSeen'), date(user.lastSeenAt)],
    [t('trust'), String(user.trustScore)],
  ];

  const counts: [string, number][] = [
    [t('listings'), user._count.vehicles],
    [t('favorites'), user._count.favorites],
    [t('savedSearches'), user._count.savedSearches],
    [t('messages'), user._count.sentMessages],
    [t('reportsFiled'), user._count.reportsFiled],
  ];

  return (
    <div>
      <Link
        href="/admin/users"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {t('back')}
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">{user.name ?? user.email ?? '—'}</h2>
        <span className="bg-muted rounded-md px-2 py-0.5 text-xs font-medium">
          {td(`roles.${user.role}`)}
        </span>
        <span
          className={cn(
            'rounded-md px-2 py-0.5 text-xs font-medium',
            STATUS_TONE[user.status] ?? 'bg-muted',
          )}
        >
          {t(`status.${user.status}`)}
        </span>
      </div>

      {user.suspendedReason ? (
        <p className="text-destructive mt-2 flex items-center gap-2 text-sm">
          <ShieldOff className="size-4 shrink-0" aria-hidden />
          {user.suspendedReason}
        </p>
      ) : null}

      {/* Angaben zum Konto. Ein Passwort steht hier nicht — es existiert nicht
          in lesbarer Form, siehe features/admin/actions.ts. */}
      <dl className="bg-card mt-6 divide-y rounded-xl border">
        {facts.map(([label, value]) => (
          <div key={label} className="flex flex-wrap gap-x-4 gap-y-1 px-4 py-3 text-sm">
            <dt className="text-muted-foreground w-40 shrink-0">{label}</dt>
            <dd className="font-medium">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        <ResetPasswordButton userId={user.id} hasEmail={Boolean(user.email)} />
        <UserSuspendButton
          userId={user.id}
          suspended={user.status === 'SUSPENDED'}
          disabled={isPrivileged || user.id === admin.id}
        />
      </div>

      <p className="text-muted-foreground mt-3 text-xs">{t('passwordNote')}</p>

      <div className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {counts.map(([label, value]) => (
          <div key={label} className="bg-card rounded-xl border p-4">
            <p className="text-muted-foreground text-xs">{label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      {user.dealer ? (
        <div className="bg-card mt-8 rounded-xl border p-4">
          <h3 className="text-sm font-semibold">{t('dealer')}</h3>
          <Link
            href={{ pathname: '/dealer/[slug]', params: { slug: user.dealer.slug } }}
            className="text-primary mt-1 inline-block text-sm hover:underline"
          >
            {user.dealer.companyName}
          </Link>
          <p className="text-muted-foreground mt-1 text-xs">
            {user.dealer.verifiedAt ? t('verified') : t('notVerified')}
          </p>
        </div>
      ) : null}

      {user.vehicles.length > 0 ? (
        <>
          <h3 className="mt-8 text-sm font-semibold">{t('recentListings')}</h3>
          <ul className="mt-3 space-y-2">
            {user.vehicles.map((vehicle) => (
              <li
                key={vehicle.id}
                className="bg-card flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 text-sm"
              >
                <Link
                  href={{ pathname: '/vehicle/[slug]', params: { slug: vehicle.slug } }}
                  className="min-w-0 flex-1 truncate font-medium hover:underline"
                >
                  {vehicle.title}
                </Link>
                <span className="text-muted-foreground text-xs">
                  {tv(`status.${vehicle.status}`)}
                </span>
                <span className="font-semibold">{price(vehicle.priceCents)}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {payments.length > 0 ? (
        <>
          <h3 className="mt-8 text-sm font-semibold">{t('payments')}</h3>
          <ul className="mt-3 space-y-2">
            {payments.map((payment) => (
              <li
                key={payment.id}
                className="bg-card flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 text-sm"
              >
                <span className="min-w-0 flex-1 truncate">
                  {isFeaturePayment(payment)
                    ? payment.vehicle?.title
                    : paymentSubject(payment, locale as Locale)}
                </span>
                <span className="text-muted-foreground text-xs">{payment.status}</span>
                <span className="font-semibold">{price(payment.amountCents)}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
