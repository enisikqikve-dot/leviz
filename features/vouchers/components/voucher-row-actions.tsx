'use client';

import { Loader2, Power, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { deleteVoucherAction, setVoucherActiveAction } from '@/features/vouchers/actions';
import { useRouter } from '@/lib/i18n/navigation';

/**
 * Abschalten oder löschen.
 *
 * Löschen geht nur, solange der Code nie eingelöst wurde — sonst hinge eine
 * Zahlung an einem Rabatt, den es nicht mehr gibt. Ein benutzter Code wird
 * abgeschaltet.
 */
export function VoucherRowActions({
  id,
  active,
  redeemed,
}: {
  id: string;
  active: boolean;
  redeemed: number;
}) {
  const t = useTranslations('admin.vouchers');
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const meldung = (schluessel: string) => (t.has(schluessel) ? t(schluessel) : schluessel);

  const laufe = (aufgabe: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      const result = await aufgabe();
      if (!result.ok) {
        toast.error(meldung(result.error ?? 'errorUnknown'));
        return;
      }
      router.refresh();
    });

  return (
    <span className="flex items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={pending}
        title={active ? t('deactivate') : t('activate')}
        onClick={() => laufe(() => setVoucherActiveAction(id, !active))}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <Power className="size-4" aria-hidden />
        )}
        <span className="sr-only">{active ? t('deactivate') : t('activate')}</span>
      </Button>

      {redeemed === 0 ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          title={t('delete')}
          onClick={() => laufe(() => deleteVoucherAction(id))}
        >
          <Trash2 className="text-destructive size-4" aria-hidden />
          <span className="sr-only">{t('delete')}</span>
        </Button>
      ) : null}
    </span>
  );
}
