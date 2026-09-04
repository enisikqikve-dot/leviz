'use client';

import { Loader2 } from 'lucide-react';
import { useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  cancelSubscriptionAction,
  resumeSubscriptionAction,
} from '@/features/packages/actions';
import { useRouter } from '@/lib/i18n/navigation';

/**
 * Kuendigen und Zuruecknehmen des laufenden Abos.
 *
 * Gekuendigt wird zum Periodenende, nie sofort — wer bezahlt hat, behaelt
 * seine Rechte bis zum bezahlten Tag.
 */
export function SubscriptionActions({
  cancelAtPeriodEnd,
  cancelLabel,
  resumeLabel,
}: {
  cancelAtPeriodEnd: boolean;
  cancelLabel: string;
  resumeLabel: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const run = (action: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      const result = await action();
      if (!result.ok) toast.error(result.error ?? '');
      else router.refresh();
    });

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="mt-4"
      disabled={isPending}
      onClick={() => run(cancelAtPeriodEnd ? resumeSubscriptionAction : cancelSubscriptionAction)}
    >
      {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
      {cancelAtPeriodEnd ? resumeLabel : cancelLabel}
    </Button>
  );
}
