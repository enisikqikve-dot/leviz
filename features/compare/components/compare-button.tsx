'use client';

import { Check, GitCompare } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useOptimistic, useTransition } from 'react';
import { toast } from 'sonner';

import { toggleCompareAction } from '@/features/compare/actions';
import { MAX_COMPARE } from '@/features/compare/store';
import { useRouter } from '@/lib/i18n/navigation';
import { cn } from '@/lib/utils';

export function CompareButton({
  vehicleId,
  initialSelected,
  className,
  withLabel = false,
  tone = 'overlay',
}: {
  vehicleId: string;
  initialSelected: boolean;
  className?: string;
  withLabel?: boolean;
  /**
   * `overlay` liegt auf dem Foto der Trefferkarte und braucht deshalb einen
   * eigenen Untergrund. `plain` steht auf einer Flaeche und fuegt sich ein.
   */
  tone?: 'overlay' | 'plain';
}) {
  const t = useTranslations('compare');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useOptimistic(initialSelected);

  function toggle(event: React.MouseEvent) {
    // Die Karte ist ein Link — der Klick darf nicht zur Detailseite führen.
    event.preventDefault();
    event.stopPropagation();

    startTransition(async () => {
      setSelected(!selected);
      const result = await toggleCompareAction(vehicleId);

      if (result.ok && result.data.full) {
        toast.error(t('max', { max: MAX_COMPARE }));
        return;
      }

      if (result.ok && result.data.selected) toast.success(t('added'));
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isPending}
      aria-pressed={selected}
      aria-label={t('add')}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-full transition-colors',
        withLabel ? 'h-11 border px-4 text-sm font-medium' : 'size-9',
        selected
          ? 'bg-primary text-primary-foreground border-primary'
          : tone === 'overlay'
            ? 'bg-white/90 text-foreground backdrop-blur-sm hover:bg-white dark:bg-black/50 dark:text-white dark:hover:bg-black/70'
            : 'bg-card text-foreground hover:bg-muted',
        'disabled:opacity-70',
        className,
      )}
    >
      {selected
        ? <Check className="size-4" aria-hidden />
        : <GitCompare className="size-4" aria-hidden />}
      {withLabel ? t('add') : null}
    </button>
  );
}
