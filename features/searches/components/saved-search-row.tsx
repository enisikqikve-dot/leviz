'use client';

import { Bell, BellOff, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { deleteSavedSearchAction, markSearchSeenAction } from '@/features/searches/actions';
import { Link, useRouter } from '@/lib/i18n/navigation';

export function SavedSearchRow({
  id, name, query, filterCount, matchCount, newCount, notifyByEmail,
}: {
  id: string;
  name: string;
  query: Record<string, string>;
  filterCount: number;
  matchCount: number;
  newCount: number;
  notifyByEmail: boolean;
}) {
  const t = useTranslations('searches');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <li className="bg-card shadow-card flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="truncate font-semibold">{name}</h2>
          {newCount > 0 ? (
            <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs font-semibold">
              {t('newMatches', { count: newCount })}
            </span>
          ) : null}
        </div>

        <p className="text-muted-foreground mt-1 text-sm">
          {t('matches', { count: matchCount })} · {t('filters', { count: filterCount })}
          {notifyByEmail ? (
            <Bell className="ms-2 inline size-3.5 align-[-2px]" aria-hidden />
          ) : (
            <BellOff className="ms-2 inline size-3.5 align-[-2px]" aria-hidden />
          )}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button
          asChild
          variant="outline"
          className="h-10"
          // Beim Öffnen gelten die neuen Treffer als gesehen.
          onClick={() => startTransition(() => void markSearchSeenAction(id))}
        >
          <Link href={{ pathname: '/search', query }}>{t('open')}</Link>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          aria-label={t('delete')}
          disabled={isPending}
          className="text-muted-foreground hover:text-destructive size-10"
          onClick={() =>
            startTransition(async () => {
              const result = await deleteSavedSearchAction(id);
              if (!result.ok) toast.error(result.error);
              else router.refresh();
            })
          }
        >
          <Trash2 className="size-4" aria-hidden />
        </Button>
      </div>
    </li>
  );
}
