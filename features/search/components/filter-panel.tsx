'use client';

import { RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useTransition } from 'react';

import { Button } from '@/components/ui/button';
import {
  AdvancedFilters, EquipmentFilters, SellerFilters,
} from '@/features/search/components/filter-sections-advanced';
import {
  BasicFilters, LocationFilters,
} from '@/features/search/components/filter-sections-basic';
import type { FilterData, FilterUpdate } from '@/features/search/components/filter-types';
import { countActiveFilters, type SearchParams } from '@/features/search/schema';
import { clearFilters, mergeSearchParams } from '@/features/search/url';
import { useRouter } from '@/lib/i18n/navigation';

export type { FilterData, FilterUpdate };

export function FilterPanel({
  params,
  data,
  onApplied,
}: {
  params: SearchParams;
  data: FilterData;
  /** Auf Mobilgeräten schließt die Schublade nach dem Anwenden. */
  onApplied?: () => void;
}) {
  const t = useTranslations('search');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const activeCount = countActiveFilters(params);

  const update: FilterUpdate = (changes) => {
    startTransition(() => {
      router.push({ pathname: '/search', query: mergeSearchParams(params, changes) });
    });
  };

  const reset = () => {
    startTransition(() => {
      router.push({ pathname: '/search', query: clearFilters(params) });
      onApplied?.();
    });
  };

  return (
    <div className="flex h-full flex-col" data-pending={isPending ? '' : undefined}>
      <div className="flex items-center justify-between gap-2 pb-2">
        <h2 className="text-sm font-semibold">{t('filters')}</h2>
        {activeCount > 0 ? (
          <button
            type="button"
            onClick={reset}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs transition-colors"
          >
            <RotateCcw className="size-3" aria-hidden />
            {t('clearFilters')}
          </button>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto">
        <BasicFilters params={params} data={data} update={update} />
        <LocationFilters params={params} data={data} update={update} />
        <AdvancedFilters params={params} data={data} update={update} />
        <SellerFilters params={params} update={update} />
        <EquipmentFilters params={params} data={data} update={update} />
      </div>

      {onApplied ? (
        <div className="bg-card sticky bottom-0 border-t pt-3">
          <Button size="lg" className="h-11 w-full" onClick={onApplied} disabled={isPending}>
            {t('applyFilters')}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
