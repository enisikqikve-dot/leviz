import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { listPackages } from '@/features/packages/queries';
import { getEurToAllRate } from '@/features/search/data';
import { VoucherForm } from '@/features/vouchers/components/voucher-form';
import { VoucherRowActions } from '@/features/vouchers/components/voucher-row-actions';
import { listVouchers, voucherTotals } from '@/features/vouchers/queries';
import { formatPrice } from '@/lib/currency';
import { getCurrency } from '@/lib/currency-server';
import type { Locale } from '@/lib/i18n/routing';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { robots: { index: false } };

export default async function AdminVouchersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('admin.vouchers');

  const [vouchers, packages, totals, currency, eurToAll] = await Promise.all([
    listVouchers(),
    listPackages(locale as Locale),
    voucherTotals(),
    getCurrency(),
    getEurToAllRate(),
  ]);

  const preis = (cents: number) =>
    formatPrice(cents, { currency, locale: locale as Locale, eurToAll });

  const datum = (value: Date | null) =>
    value
      ? new Intl.DateTimeFormat(locale === 'sq' ? 'sq-AL' : locale, { dateStyle: 'short' }).format(
          value,
        )
      : '—';

  return (
    <div>
      <h2 className="text-lg font-semibold">{t('title')}</h2>
      <p className="text-muted-foreground mt-1 text-sm">{t('subtitle')}</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {(
          [
            [t('statCodes'), String(totals.codes)],
            [t('statRedeemed'), String(totals.eingeloest)],
            [t('statGiven'), preis(totals.rabattCents)],
          ] as [string, string][]
        ).map(([label, value]) => (
          <div key={label} className="bg-card rounded-xl border p-4">
            <p className="text-muted-foreground text-xs">{label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      <h3 className="mt-8 text-sm font-semibold">{t('newTitle')}</h3>
      <div className="mt-3">
        <VoucherForm
          packages={packages.map((pkg) => ({ id: pkg.id, name: pkg.name }))}
        />
      </div>

      <h3 className="mt-10 text-sm font-semibold">{t('listTitle')}</h3>

      {vouchers.length === 0 ? (
        <p className="bg-card text-muted-foreground mt-3 rounded-xl border p-6 text-sm">
          {t('empty')}
        </p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[46rem] text-sm">
            <thead className="text-muted-foreground text-left text-xs">
              <tr>
                <th className="px-3 py-2 font-medium">{t('code')}</th>
                <th className="px-3 py-2 font-medium">{t('value')}</th>
                <th className="px-3 py-2 font-medium">{t('package')}</th>
                <th className="px-3 py-2 font-medium">{t('used')}</th>
                <th className="px-3 py-2 font-medium">{t('validUntil')}</th>
                <th className="px-3 py-2 font-medium">{t('state')}</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {vouchers.map((voucher) => (
                <tr key={voucher.id} className="bg-card">
                  <td className="px-3 py-2 font-mono text-xs font-semibold">
                    {voucher.code}
                    {voucher.label ? (
                      <span className="text-muted-foreground ms-2 font-sans font-normal">
                        {voucher.label}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 font-medium">
                    {voucher.kind === 'PERCENT'
                      ? `${voucher.percentOff} %`
                      : preis(voucher.amountOffCents ?? 0)}
                  </td>
                  <td className="text-muted-foreground px-3 py-2">
                    {voucher.package?.nameSq ?? t('allPackages')}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {voucher._count.redemptions} / {voucher.maxRedemptions}
                  </td>
                  <td className="text-muted-foreground px-3 py-2">{datum(voucher.validUntil)}</td>
                  <td className="px-3 py-2">
                    <span
                      className={cn(
                        'rounded-md px-2 py-0.5 text-xs font-medium',
                        voucher.active
                          ? 'bg-success/10 text-success'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {voucher.active ? t('active') : t('inactive')}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-end">
                    <VoucherRowActions
                      id={voucher.id}
                      active={voucher.active}
                      redeemed={voucher._count.redemptions}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
