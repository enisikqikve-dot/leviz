'use client';

import { Trash2, X } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { clearCompareAction, toggleCompareAction } from '@/features/compare/actions';
import type { ComparisonRow } from '@/features/compare/rows';
import { Link, useRouter } from '@/lib/i18n/navigation';
import { cn } from '@/lib/utils';

type Column = {
  id: string;
  slug: string;
  title: string;
  imageUrl: string | null;
  price: string;
};

export function CompareActions({
  vehicles, rows, featureRows, equipmentLabel,
}: {
  vehicles: Column[];
  rows: ComparisonRow[];
  featureRows: ComparisonRow[];
  equipmentLabel: string;
}) {
  const t = useTranslations('compare');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [onlyDiff, setOnlyDiff] = useState(false);

  const visible = onlyDiff ? rows.filter((row) => row.differs) : rows;
  const visibleFeatures = onlyDiff ? featureRows.filter((row) => row.differs) : featureRows;

  const remove = (id: string) =>
    startTransition(async () => {
      await toggleCompareAction(id);
      router.refresh();
    });

  const renderRow = (row: ComparisonRow) => (
    <tr key={row.key} className={cn(row.differs && 'bg-primary/[0.03]')}>
      <th scope="row" className="text-muted-foreground border-b px-3 py-2.5 text-start text-sm font-normal">
        {row.label}
      </th>
      {row.values.map((value, index) => (
        <td
          key={index}
          className={cn(
            'border-b px-3 py-2.5 text-sm',
            // Der beste Wert der Zeile wird hervorgehoben.
            row.best.includes(index) ? 'text-success font-semibold' : 'font-medium',
          )}
        >
          {value ?? '—'}
        </td>
      ))}
    </tr>
  );

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          {t('count', { count: vehicles.length })}
        </p>
        <div className="flex items-center gap-3">
          <label className="hover:bg-muted flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors">
            <input
              type="checkbox"
              className="accent-primary size-4"
              checked={onlyDiff}
              onChange={(event) => setOnlyDiff(event.target.checked)}
            />
            {t('onlyDifferences')}
          </label>
          <Button
            variant="outline"
            className="h-10"
            disabled={isPending}
            onClick={() => startTransition(async () => { await clearCompareAction(); router.refresh(); })}
          >
            <Trash2 className="size-4" aria-hidden />
            {t('clear')}
          </Button>
        </div>
      </div>

      {/* Breite Tabellen scrollen in sich, die Seite selbst nicht. */}
      <div className="mt-4 overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[46rem] border-collapse">
          <thead>
            <tr>
              <th className="bg-card sticky start-0 w-40 border-b px-3 py-3 text-start" />
              {vehicles.map((vehicle) => (
                <th key={vehicle.id} className="border-b p-3 align-top">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => remove(vehicle.id)}
                      disabled={isPending}
                      aria-label={t('remove')}
                      className="bg-muted hover:bg-border absolute end-0 top-0 z-10 inline-flex size-7 items-center justify-center rounded-full transition-colors"
                    >
                      <X className="size-3.5" aria-hidden />
                    </button>

                    <Link
                      href={{ pathname: '/vehicle/[slug]', params: { slug: vehicle.slug } }}
                      className="block"
                    >
                      <div className="bg-muted relative aspect-[4/3] overflow-hidden rounded-lg">
                        {vehicle.imageUrl ? (
                          <Image src={vehicle.imageUrl} alt="" fill sizes="220px" className="object-cover" />
                        ) : null}
                      </div>
                      <p className="mt-2 truncate text-sm font-semibold">{vehicle.title}</p>
                      <p className="text-sm">{vehicle.price}</p>
                    </Link>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {visible.map(renderRow)}

            {visibleFeatures.length > 0 ? (
              <>
                <tr>
                  <th
                    scope="colgroup"
                    colSpan={vehicles.length + 1}
                    className="bg-surface border-b px-3 py-2.5 text-start text-sm font-semibold"
                  >
                    {equipmentLabel}
                  </th>
                </tr>
                {visibleFeatures.map(renderRow)}
              </>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
