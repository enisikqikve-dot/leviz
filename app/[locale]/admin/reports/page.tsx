import type { Metadata } from 'next';
import { ShieldCheck } from 'lucide-react';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';

import { ReportActions } from '@/features/admin/components/report-actions';
import { getOpenReports } from '@/features/admin/queries';
import { formatDate } from '@/features/vehicles/format';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';

export const metadata: Metadata = { robots: { index: false } };

export default async function AdminReportsPage({
  params,
}: PageProps<'/[locale]/admin/reports'>) {
  const { locale } = await params;
  const t = await getTranslations('admin.reports');

  const reports = await getOpenReports();

  return (
    <div>
      <h2 className="text-lg font-semibold">{t('title')}</h2>

      {reports.length === 0 ? (
        <div className="bg-surface mt-4 flex flex-col items-center rounded-xl border px-6 py-16 text-center">
          <span className="bg-success/10 text-success inline-flex size-14 items-center justify-center rounded-full">
            <ShieldCheck className="size-7" aria-hidden />
          </span>
          <p className="mt-5 font-semibold">{t('noReports')}</p>
          <p className="text-muted-foreground mt-2 text-sm">{t('noReportsHint')}</p>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {reports.map((report) => (
            <li key={report.id} className="bg-card rounded-xl border p-4">
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="bg-muted relative h-24 w-full shrink-0 overflow-hidden rounded-lg sm:h-20 sm:w-28">
                  {report.vehicle.images[0] ? (
                    <Image
                      src={report.vehicle.images[0].url}
                      alt=""
                      fill
                      sizes="112px"
                      className="object-cover"
                    />
                  ) : null}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="bg-destructive/10 text-destructive rounded-md px-2 py-0.5 text-xs font-semibold">
                      {t(`reasons.${report.reason}`)}
                    </span>
                    <span className="bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-xs">
                      {t(`statuses.${report.status}`)}
                    </span>
                  </div>

                  <Link
                    href={{ pathname: '/vehicle/[slug]', params: { slug: report.vehicle.slug } }}
                    className="mt-2 block font-semibold hover:underline"
                  >
                    {report.vehicle.title}
                  </Link>

                  {report.details ? (
                    <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                      {report.details}
                    </p>
                  ) : null}

                  <p className="text-muted-foreground mt-2 text-xs">
                    {t('reporter')}: {report.reporter?.name ?? report.reporter?.email ?? '—'}
                    {' · '}
                    {formatDate(report.createdAt, locale as Locale)}
                  </p>

                  <div className="mt-4">
                    <ReportActions reportId={report.id} />
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
