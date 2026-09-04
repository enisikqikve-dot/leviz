'use client';

import { ArrowUpDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useTransition } from 'react';

import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { mergeSearchParams } from '@/features/search/url';
import { SORT_OPTIONS, type SearchParams, type SortOption } from '@/features/search/schema';
import { useRouter } from '@/lib/i18n/navigation';

export function SortSelect({
  params,
  hasCenter,
}: {
  params: SearchParams;
  /** Ohne Stadt und Radius ergibt eine Sortierung nach Entfernung keinen Sinn. */
  hasCenter: boolean;
}) {
  const t = useTranslations('search');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const options = SORT_OPTIONS.filter((option) => option !== 'distance' || hasCenter);

  function select(next: string) {
    startTransition(() => {
      router.push({
        pathname: '/search',
        query: mergeSearchParams(params, { sort: next as SortOption }),
      });
    });
  }

  return (
    <Select value={params.sort ?? 'relevance'} onValueChange={select} disabled={isPending}>
      <SelectTrigger className="h-10 w-full sm:w-60" aria-label={t('sortLabel')}>
        <ArrowUpDown className="text-muted-foreground size-4" aria-hidden />
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {t(`sort.${option}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
