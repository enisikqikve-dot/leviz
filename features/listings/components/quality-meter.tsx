'use client';

import { CheckCircle2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { QualityResult } from '@/features/vehicles/quality-score';
import { cn } from '@/lib/utils';

/**
 * Zeigt dem Verkäufer, wie vollständig sein Inserat ist, und was den größten
 * Gewinn bringt. Der Wert fließt in die Reihung der Suchergebnisse ein.
 */
export function QualityMeter({ quality }: { quality: QualityResult }) {
  const t = useTranslations('listing.quality');

  const tone =
    quality.score >= 80 ? 'bg-success' : quality.score >= 55 ? 'bg-featured' : 'bg-destructive';

  return (
    <div className="bg-card rounded-xl border p-5">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-sm font-semibold">{t('title')}</h2>
        <p className="text-2xl font-semibold tracking-tight">{quality.score}%</p>
      </div>

      <div
        className="bg-muted mt-3 h-2 overflow-hidden rounded-full"
        role="progressbar"
        aria-valuenow={quality.score}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn('h-full rounded-full transition-all duration-500', tone)}
          style={{ width: `${quality.score}%` }}
        />
      </div>

      {quality.hints.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {quality.hints.slice(0, 4).map((hint) => (
            <li key={hint.key} className="flex items-start justify-between gap-3 text-sm">
              <span className="text-muted-foreground">
                {t(hint.key, { count: hint.values?.count ?? 0 })}
              </span>
              <span className="text-primary shrink-0 text-xs font-medium">
                {t('gain', { gain: hint.gain })}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-success mt-4 inline-flex items-center gap-1.5 text-sm">
          <CheckCircle2 className="size-4" aria-hidden />
          100%
        </p>
      )}
    </div>
  );
}
