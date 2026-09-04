import { ShieldOff } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { Button } from '@/components/ui/button';
import { Link } from '@/lib/i18n/navigation';

/** Angemeldet, aber ohne Berechtigung fuer diesen Bereich. */
export default async function Forbidden() {
  const t = await getTranslations('nav');
  const tc = await getTranslations('common');

  return (
    <div className="lv-container flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <span className="bg-destructive/10 text-destructive inline-flex size-14 items-center justify-center rounded-full">
        <ShieldOff className="size-7" aria-hidden />
      </span>
      <p className="text-destructive mt-8 text-sm font-semibold">403</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
        {tc('forbiddenTitle')}
      </h1>
      <p className="text-muted-foreground mt-3 max-w-md text-base">
        {tc('forbiddenHint')}
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg">
          <Link href="/">LEVIZ</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/dashboard">{t('dashboard')}</Link>
        </Button>
      </div>
    </div>
  );
}
