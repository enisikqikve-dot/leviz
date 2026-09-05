import type { Metadata } from 'next';
import { Bug } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { BugReportForm } from '@/features/feedback/components/bug-report-form';
import { getSessionUser } from '@/lib/auth/guards';
import { Link } from '@/lib/i18n/navigation';

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'feedback' });
  return { title: t('title'), description: t('intro') };
}

export default async function ReportBugPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('feedback');

  // Bewusst kein Wächter: wer über einen kaputten Anmeldevorgang stolpert,
  // kann sich nicht anmelden, um genau das zu melden.
  const user = await getSessionUser();

  return (
    <div className="lv-container max-w-2xl py-12">
      <span className="bg-primary/10 text-primary inline-flex size-11 items-center justify-center rounded-xl">
        <Bug className="size-5" aria-hidden />
      </span>

      <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">{t('title')}</h1>
      <p className="text-muted-foreground mt-3 text-base">{t('intro')}</p>

      <div className="border-warning/40 bg-warning/10 text-warning-foreground dark:text-warning mt-6 rounded-lg border px-4 py-3 text-sm">
        {t.rich('notForListings', {
          link: (chunks) => (
            <Link href="/search" className="font-medium underline underline-offset-2">
              {chunks}
            </Link>
          ),
        })}
      </div>

      <div className="mt-8">
        <BugReportForm signedInEmail={user?.email ?? null} />
      </div>
    </div>
  );
}
