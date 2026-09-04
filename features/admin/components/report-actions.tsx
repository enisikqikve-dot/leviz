'use client';

import { Check, EyeOff, Loader2, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { resolveReportAction } from '@/features/admin/actions';
import { useRouter } from '@/lib/i18n/navigation';

/**
 * Entscheidung über eine Meldung.
 *
 * Verwerfen lässt das Inserat unverändert, Ausblenden nimmt es aus der Suche,
 * Löschen entfernt es endgültig — deshalb dort eine Rückfrage.
 */
export function ReportActions({ reportId }: { reportId: string }) {
  const t = useTranslations('admin.reports');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const run = (action: 'DISMISSED' | 'HIDDEN' | 'DELETED') =>
    startTransition(async () => {
      const result = await resolveReportAction({ reportId, action });
      if (!result.ok) toast.error(result.error);
      else router.refresh();
    });

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" className="h-9" disabled={isPending} onClick={() => run('DISMISSED')}>
        {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Check className="size-4" aria-hidden />}
        {t('dismiss')}
      </Button>

      <Button variant="outline" className="h-9" disabled={isPending} onClick={() => run('HIDDEN')}>
        <EyeOff className="size-4" aria-hidden />
        {t('hideVehicle')}
      </Button>

      <Button
        variant="destructive"
        className="h-9"
        disabled={isPending}
        onClick={() => {
          if (window.confirm(t('hideVehicle'))) run('DELETED');
        }}
      >
        <Trash2 className="size-4" aria-hidden />
      </Button>
    </div>
  );
}
