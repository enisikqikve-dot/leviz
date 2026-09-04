'use client';

import { Check, Loader2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { approveVehicleAction, rejectVehicleAction } from '@/features/admin/actions';
import { useRouter } from '@/lib/i18n/navigation';

/** Freigeben oder ablehnen. Eine Ablehnung verlangt immer einen Grund. */
export function ModerationActions({ vehicleId }: { vehicleId: string }) {
  const t = useTranslations('admin.vehicles');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');

  const run = (action: () => Promise<{ ok: boolean; error?: string }>, message: string) =>
    startTransition(async () => {
      const result = await action();

      if (!result.ok) {
        toast.error(result.error ?? '');
        return;
      }

      toast.success(message);
      setRejecting(false);
      setReason('');
      router.refresh();
    });

  if (rejecting) {
    return (
      <div className="w-full space-y-2">
        <textarea
          rows={2}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          maxLength={500}
          placeholder={t('rejectReason')}
          aria-label={t('rejectReason')}
          className="border-input bg-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
        />
        <div className="flex gap-2">
          <Button
            variant="destructive"
            className="h-9"
            disabled={isPending || reason.trim().length < 3}
            onClick={() => run(() => rejectVehicleAction({ vehicleId, reason }), t('rejected'))}
          >
            {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            {t('reject')}
          </Button>
          <Button variant="ghost" className="h-9" onClick={() => setRejecting(false)}>
            <X className="size-4" aria-hidden />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Button
        className="h-9"
        disabled={isPending}
        onClick={() => run(() => approveVehicleAction(vehicleId), t('approved'))}
      >
        <Check className="size-4" aria-hidden />
        {t('approve')}
      </Button>
      <Button
        variant="outline"
        className="h-9"
        disabled={isPending}
        onClick={() => setRejecting(true)}
      >
        <X className="size-4" aria-hidden />
        {t('reject')}
      </Button>
    </div>
  );
}
