import { getTranslations, setRequestLocale } from 'next-intl/server';

import { AdminNav } from '@/features/admin/components/admin-nav';
import { requireAdmin } from '@/lib/auth/guards';
import { prisma } from '@/lib/db';

/**
 * Rahmen des Verwaltungsbereichs. Der Rollenwächter steht hier, damit keine
 * Unterseite ihn vergessen kann — die Prüfung läuft für jede von ihnen.
 */
export default async function AdminLayout({
  children,
  params,
}: LayoutProps<'/[locale]/admin'>) {
  const { locale } = await params;
  setRequestLocale(locale as string);

  await requireAdmin();

  const t = await getTranslations('admin');
  const openReports = await prisma.report.count({ where: { status: 'OPEN' } });

  return (
    <div className="lv-container py-8 sm:py-12">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('title')}</h1>

      <div className="mt-6 lg:grid lg:grid-cols-[13rem_1fr] lg:items-start lg:gap-8">
        <aside className="lg:sticky lg:top-20">
          <AdminNav openReports={openReports} />
        </aside>
        <div className="mt-6 min-w-0 lg:mt-0">{children}</div>
      </div>
    </div>
  );
}
