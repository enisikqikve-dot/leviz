'use client';

import { SlidersHorizontal } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet';
import { FilterPanel } from '@/features/search/components/filter-panel';
import type { FilterData } from '@/features/search/components/filter-types';
import { countActiveFilters, type SearchParams } from '@/features/search/schema';

/**
 * Auf Mobilgeräten sind die Filter kein zusammengeschrumpfter Seitenbereich,
 * sondern eine eigene Schublade über die volle Höhe.
 */
export function FilterDrawer({
  params,
  data,
}: {
  params: SearchParams;
  data: FilterData;
}) {
  const t = useTranslations('search');
  const [open, setOpen] = useState(false);
  const activeCount = countActiveFilters(params);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="h-10 w-full sm:w-auto lg:hidden">
          <SlidersHorizontal className="size-4" aria-hidden />
          {t('filters')}
          {activeCount > 0 ? (
            <span className="bg-primary text-primary-foreground ms-1 inline-flex size-5 items-center justify-center rounded-full text-xs font-semibold">
              {activeCount}
            </span>
          ) : null}
        </Button>
      </SheetTrigger>

      <SheetContent side="left" className="flex w-[min(24rem,92vw)] flex-col p-0">
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="text-left">{t('filters')}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-hidden px-5 pb-5">
          <FilterPanel params={params} data={data} onApplied={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
