'use client';

import { Loader2 } from 'lucide-react';
import { useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { confirmMockPaymentAction } from '@/features/packages/actions';
import { useRouter } from '@/lib/i18n/navigation';

/**
 * Bestaetigung auf der Bezahlseite des Mock-Anbieters.
 *
 * Beide Wege — bezahlen und abbrechen — gehen ueber denselben signierten
 * Rueckruf wie bei einem echten Anbieter. Nach dem Abschluss fuehrt der Weg
 * zur Zahlungsuebersicht, wo das Ergebnis steht.
 */
export function CheckoutForm({
  paymentId,
  payLabel,
  cancelLabel,
}: {
  paymentId: string;
  payLabel: string;
  cancelLabel: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const settle = (outcome: 'SUCCEEDED' | 'FAILED') =>
    startTransition(async () => {
      const result = await confirmMockPaymentAction(paymentId, outcome);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      router.push('/dashboard/billing');
    });

  return (
    <div className="mt-5 space-y-2">
      <Button
        type="button"
        className="w-full"
        disabled={isPending}
        onClick={() => settle('SUCCEEDED')}
      >
        {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        {payLabel}
      </Button>

      <Button
        type="button"
        variant="ghost"
        className="w-full"
        disabled={isPending}
        onClick={() => settle('FAILED')}
      >
        {cancelLabel}
      </Button>
    </div>
  );
}
