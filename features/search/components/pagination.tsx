import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { mergeSearchParams } from '@/features/search/url';
import type { SearchParams } from '@/features/search/schema';
import { Link } from '@/lib/i18n/navigation';
import { cn } from '@/lib/utils';

/**
 * Seitenzahlen mit Auslassungen, damit die Leiste auch bei 200 Seiten in eine
 * Zeile passt: immer erste, letzte und die Nachbarn der aktuellen Seite.
 */
function pageWindow(current: number, total: number): (number | 'gap')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages = new Set([1, total, current, current - 1, current + 1]);
  if (current <= 3) [2, 3, 4].forEach((page) => pages.add(page));
  if (current >= total - 2) [total - 3, total - 2, total - 1].forEach((page) => pages.add(page));

  const sorted = [...pages].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b);

  const output: (number | 'gap')[] = [];
  let previous = 0;
  for (const page of sorted) {
    if (previous && page - previous > 1) output.push('gap');
    output.push(page);
    previous = page;
  }
  return output;
}

export async function Pagination({
  params,
  page,
  pageCount,
}: {
  params: SearchParams;
  page: number;
  pageCount: number;
}) {
  if (pageCount <= 1) return null;

  const t = await getTranslations('search');
  const pages = pageWindow(page, pageCount);

  const linkTo = (target: number) => ({
    pathname: '/search' as const,
    query: mergeSearchParams(params, { page: target }),
  });

  const itemClass =
    'inline-flex h-10 min-w-10 items-center justify-center rounded-lg border px-3 text-sm font-medium transition-colors';

  return (
    <nav aria-label={t('page')} className="mt-10 flex items-center justify-center gap-1.5">
      {page > 1 ? (
        <Link href={linkTo(page - 1)} rel="prev" className={cn(itemClass, 'hover:bg-muted')}>
          <ChevronLeft className="size-4" aria-hidden />
          <span className="sr-only sm:not-sr-only sm:ms-1">{t('previous')}</span>
        </Link>
      ) : (
        <span className={cn(itemClass, 'text-muted-foreground opacity-50')} aria-disabled>
          <ChevronLeft className="size-4" aria-hidden />
        </span>
      )}

      {pages.map((entry, index) =>
        entry === 'gap' ? (
          <span key={`gap-${index}`} className="text-muted-foreground px-1" aria-hidden>
            …
          </span>
        ) : (
          <Link
            key={entry}
            href={linkTo(entry)}
            aria-current={entry === page ? 'page' : undefined}
            className={cn(
              itemClass,
              entry === page
                ? 'bg-primary text-primary-foreground border-primary'
                : 'hover:bg-muted',
            )}
          >
            {entry}
          </Link>
        ),
      )}

      {page < pageCount ? (
        <Link href={linkTo(page + 1)} rel="next" className={cn(itemClass, 'hover:bg-muted')}>
          <span className="sr-only sm:not-sr-only sm:me-1">{t('next')}</span>
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      ) : (
        <span className={cn(itemClass, 'text-muted-foreground opacity-50')} aria-disabled>
          <ChevronRight className="size-4" aria-hidden />
        </span>
      )}
    </nav>
  );
}
