'use client';

import { MoreVertical, Pause, Pencil, Play, Tag, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { toast } from 'sonner';

import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  deleteListingAction, markListingSoldAction, toggleListingPauseAction,
} from '@/features/listings/actions';
import { Link, useRouter } from '@/lib/i18n/navigation';
import type { VehicleStatus } from '@/lib/generated/prisma/enums';

/** Verwaltungsaktionen zu einer einzelnen Anzeige. */
export function ListingActions({
  vehicleId,
  status,
}: {
  vehicleId: string;
  status: VehicleStatus;
}) {
  const t = useTranslations('myListings');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const run = (action: () => Promise<{ ok: boolean; error?: string }>) => {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) toast.error(result.error ?? '');
      else router.refresh();
    });
  };

  const canPause = status === 'ACTIVE' || status === 'PAUSED';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t('title')}
        disabled={isPending}
        className="hover:bg-muted inline-flex size-9 items-center justify-center rounded-md transition-colors disabled:opacity-50"
      >
        <MoreVertical className="size-4" aria-hidden />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuItem asChild>
          <Link
            href={{ pathname: '/sell/edit/[id]', params: { id: vehicleId } }}
            className="cursor-pointer"
          >
            <Pencil className="size-4" aria-hidden />
            {t('edit')}
          </Link>
        </DropdownMenuItem>

        {canPause ? (
          <DropdownMenuItem
            className="cursor-pointer"
            onSelect={() => run(() => toggleListingPauseAction(vehicleId))}
          >
            {status === 'ACTIVE'
              ? <Pause className="size-4" aria-hidden />
              : <Play className="size-4" aria-hidden />}
            {status === 'ACTIVE' ? t('pause') : t('resume')}
          </DropdownMenuItem>
        ) : null}

        {status !== 'SOLD' ? (
          <DropdownMenuItem
            className="cursor-pointer"
            onSelect={() => run(() => markListingSoldAction(vehicleId))}
          >
            <Tag className="size-4" aria-hidden />
            {t('markSold')}
          </DropdownMenuItem>
        ) : null}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="text-destructive cursor-pointer"
          onSelect={() => {
            // Löschen ist endgültig, darum eine ausdrückliche Rückfrage.
            if (window.confirm(t('confirmDelete'))) {
              run(() => deleteListingAction(vehicleId));
            }
          }}
        >
          <Trash2 className="size-4" aria-hidden />
          {t('delete')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
