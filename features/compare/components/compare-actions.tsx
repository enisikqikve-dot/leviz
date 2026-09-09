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

      {/*
        Breite Tabellen scrollen in sich, die Seite selbst nicht.

        `table-fixed` ist hier kein Detail, sondern der ganze Punkt: ohne diese
        Angabe teilt der Browser die Spalten nach ihrem Inhalt auf. Ein breites
        Foto zog seine Spalte auf, das danebenstehende schrumpfte — zwei Autos
        nebeneinander waren dann unterschiedlich gross, und ein Vergleich, in
        dem eine Seite groesser wirkt als die andere, vergleicht nicht mehr.
        Mit fester Aufteilung bekommt jedes Fahrzeug genau gleich viel Platz.

        Die Mindestbreite waechst mit der Anzahl mit, statt fest zu stehen: bei
        vier Fahrzeugen waeren feste 46rem je Spalte zu eng geworden.
      */}
      <div className="mt-4 overflow-x-auto rounded-xl border">
        <table
          className="w-full table-fixed border-collapse"
          style={{ minWidth: `calc(10rem + ${vehicles.length} * 15rem)` }}
        >
          <thead>
            <tr>
              <th className="bg-card sticky start-0 w-40 border-b px-3 py-3 text-start" />
              {vehicles.map((vehicle) => (
                // `text-start`, weil eine Kopfzelle sonst mittig ausrichtet:
                // Name und Preis standen zentriert ueber einem Foto, das die
                // ganze Spalte fuellt — und damit versetzt zu allem darunter.
                <th key={vehicle.id} className="border-b p-3 text-start align-top">
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
                          // 220px war zu wenig: bei zwei Fahrzeugen auf einem
                          // breiten Bildschirm wird eine Spalte ueber 600px
                          // breit, und das kleine Bild wurde hochgerechnet.
                          <Image
                            src={vehicle.imageUrl}
                            alt=""
                            fill
                            sizes="(min-width: 1280px) 30vw, (min-width: 640px) 40vw, 60vw"
                            className="object-cover"
                          />
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
