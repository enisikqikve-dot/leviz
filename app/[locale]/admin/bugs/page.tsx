import type { Metadata } from 'next';
import { Bug } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { BugStatusForm } from '@/features/feedback/components/bug-status-form';
import type { BugStatus } from '@/features/feedback/schemas';
import { prisma } from '@/lib/db';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { robots: { index: false } };

type PageProps = { params: Promise<{ locale: string }> };

const STATUS_TONE: Record<string, string> = {
  OPEN: 'bg-destructive/10 text-destructive',
  REVIEWING: 'bg-warning/15 text-warning-foreground dark:text-warning',
  RESOLVED: 'bg-success/10 text-success',
  DISMISSED: 'bg-muted text-muted-foreground',
};

export default async function AdminBugsPage({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations('admin.bugs');
  const tf = await getTranslations('feedback');

  const reports = await prisma.bugReport.findMany({
    // Offene zuerst, darin die neuesten: die Liste soll die Arbeit zeigen,
    // nicht die Geschichte.
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    take: 100,
    select: {
      id: true,
      kind: true,
      message: true,
      pageUrl: true,
      userAgent: true,
      locale: true,
      email: true,
      status: true,
      note: true,
      createdAt: true,
      reporter: { select: { name: true, email: true } },
      handledBy: { select: { name: true } },
    },
  });

  const formatter = new Intl.DateTimeFormat(locale === 'sq' ? 'sq-AL' : locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <div>
      <h2 className="text-lg font-semibold">{t('title')}</h2>
      <p className="text-muted-foreground mt-1 text-sm">{t('subtitle')}</p>

      {reports.length === 0 ? (
        <div className="bg-surface mt-6 flex flex-col items-center rounded-xl border px-6 py-14 text-center">
          <span className="bg-muted text-muted-foreground inline-flex size-12 items-center justify-center rounded-full">
            <Bug className="size-6" aria-hidden />
          </span>
          <p className="text-muted-foreground mt-4 text-sm">{t('empty')}</p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {reports.map((report) => (
            <li
              key={report.id}
              className="bg-card text-card-foreground rounded-xl border p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-muted rounded-full px-2 py-0.5 text-xs font-medium">
                  {tf(`kinds.${report.kind}`)}
                </span>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-medium',
                    STATUS_TONE[report.status] ?? 'bg-muted',
                  )}
                >
                  {t(`status.${report.status}`)}
                </span>
                <span className="text-muted-foreground ms-auto text-xs">
                  {formatter.format(report.createdAt)}
                </span>
              </div>

              <p className="mt-3 text-sm whitespace-pre-wrap">{report.message}</p>

              {/* Der Zusammenhang, ohne den sich nichts nachstellen lässt. */}
              <dl className="text-muted-foreground mt-3 space-y-1 text-xs">
                {report.pageUrl ? (
                  <div className="flex gap-2">
                    <dt className="shrink-0">{t('onPage')}</dt>
                    <dd className="truncate font-mono">{report.pageUrl}</dd>
                  </div>
                ) : null}
                <div className="flex gap-2">
                  <dt className="shrink-0">{t('from')}</dt>
                  <dd className="truncate">
                    {report.reporter?.name ?? report.reporter?.email ?? report.email ?? t('anonymous')}
                    {report.locale ? ` · ${report.locale}` : null}
                  </dd>
                </div>
                {report.userAgent ? (
                  <div className="flex gap-2">
                    <dt className="shrink-0">{t('browser')}</dt>
                    <dd className="truncate font-mono">{report.userAgent}</dd>
                  </div>
                ) : null}
                {report.handledBy ? (
                  <div className="flex gap-2">
                    <dt className="shrink-0">{t('handledBy')}</dt>
                    <dd>{report.handledBy.name}</dd>
                  </div>
                ) : null}
              </dl>

              <BugStatusForm
                id={report.id}
                status={report.status as BugStatus}
                note={report.note}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
