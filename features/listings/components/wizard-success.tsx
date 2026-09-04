'use client';

import { CheckCircle2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Link } from '@/lib/i18n/navigation';

/** Abschlussbild nach dem Veröffentlichen. */
export function WizardSuccess({ slug, pending }: { slug: string; pending: boolean }) {
  const t = useTranslations('listing.success');

  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <span className="bg-success/10 text-success inline-flex size-14 items-center justify-center rounded-full">
        <CheckCircle2 className="size-7" aria-hidden />
      </span>

      <h1 className="mt-6 text-2xl font-semibold tracking-tight">
        {pending ? t('pending') : t('published')}
      </h1>
      {pending ? (
        <p className="text-muted-foreground mt-2 text-sm">{t('pendingHint')}</p>
      ) : null}

      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        {pending ? null : (
          <Button asChild size="lg">
            <Link href={{ pathname: '/vehicle/[slug]', params: { slug } }}>{t('view')}</Link>
          </Button>
        )}
        <Button asChild variant="outline" size="lg">
          <Link href="/dashboard/listings">{t('myListings')}</Link>
        </Button>
      </div>
    </div>
  );
}
