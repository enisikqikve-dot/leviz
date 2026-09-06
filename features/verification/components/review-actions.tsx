'use client';

import { Check, Loader2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { reviewVerificationAction } from '@/features/verification/actions';
import { useRouter } from '@/lib/i18n/navigation';

/**
 * Annehmen oder ablehnen, mit einem Feld für die Begründung.
 *
 * Die Begründung ist bei einer Ablehnung Pflicht — das prüft auch der Server.
 * Ohne sie steht der Antragsteller vor einem „nein" ohne Anhaltspunkt und
 * lädt dieselben Bilder noch einmal hoch.
 */
export function ReviewActions({ requestId }: { requestId: string }) {
  const t = useTranslations('admin.verifications');
  const router = useRouter();
  const [note, setNote] = useState('');
  const [pending, startTransition] = useTransition();

  function entscheide(decision: 'VERIFIED' | 'REJECTED') {
    startTransition(async () => {
      const result = await reviewVerificationAction({ id: requestId, decision, note });

      if (!result.ok) {
        const feld = result.fieldErrors?.note?.[0];
        const meldung = feld ?? result.error;
        toast.error(t.has(meldung) ? t(meldung) : meldung);
        return;
      }

      toast.success(decision === 'VERIFIED' ? t('approved') : t('rejected'));
      router.refresh();
    });
  }

  return (
    <div className="mt-4 border-t pt-4">
      <label htmlFor={`note-${requestId}`} className="text-sm font-medium">
        {t('note')}
      </label>
      <textarea
        id={`note-${requestId}`}
        rows={2}
        maxLength={1000}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder={t('notePlaceholder')}
        className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 mt-1.5 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-[3px]"
      />

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={pending}
          onClick={() => entscheide('VERIFIED')}
          className="flex-1"
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Check className="size-4" aria-hidden />
          )}
          {t('approve')}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => entscheide('REJECTED')}
          className="text-destructive flex-1"
        >
          <X className="size-4" aria-hidden />
          {t('reject')}
        </Button>
      </div>
    </div>
  );
}
