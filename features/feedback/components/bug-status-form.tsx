'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { updateBugStatusAction } from '@/features/feedback/actions';
import { BUG_STATUSES, type BugStatus } from '@/features/feedback/schemas';

/**
 * Bearbeitungsstand einer Meldung ändern.
 *
 * Ein Freitextfeld für die Notiz gibt es bewusst: „erledigt" ohne Begründung
 * hilft beim nächsten Blick in die Liste niemandem.
 */
export function BugStatusForm({
  id,
  status,
  note,
}: {
  id: string;
  status: BugStatus;
  note: string | null;
}) {
  const t = useTranslations('admin.bugs');
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState(note ?? '');

  const change = (next: BugStatus) => {
    startTransition(async () => {
      const result = await updateBugStatusAction({ id, status: next, note: draft });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(t('saved'));
    });
  };

  return (
    <div className="mt-4 space-y-3 border-t pt-4">
      <textarea
        rows={2}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder={t('notePlaceholder')}
        className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-[3px]"
      />

      <div className="flex flex-wrap gap-2">
        {BUG_STATUSES.filter((value) => value !== status).map((value) => (
          <Button
            key={value}
            size="sm"
            variant={value === 'RESOLVED' ? 'default' : 'outline'}
            disabled={pending}
            onClick={() => change(value)}
          >
            {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
            {t(`setStatus.${value}`)}
          </Button>
        ))}
      </div>
    </div>
  );
}
