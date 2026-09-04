import { ArrowRight, Search } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { LevizIcon } from '@/components/leviz/logo';
import { Button } from '@/components/ui/button';
import { Link } from '@/lib/i18n/navigation';

export default async function LocaleNotFound() {
  const t = await getTranslations('nav');
  const tc = await getTranslations('common');

  return (
    <div className="lv-container flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <LevizIcon className="size-14" />
      <p className="text-primary mt-8 text-sm font-semibold">404</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
        {tc('notFoundTitle')}
      </h1>
      <p className="text-muted-foreground mt-3 max-w-md text-base">
        {tc('notFoundHint')}
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg">
          <Link href="/search">
            <Search className="size-4" aria-hidden />
            {t('search')}
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/">
            LEVIZ
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </Button>
      </div>
    </div>
  );
}
