'use client';

import { Loader2 } from 'lucide-react';
import { useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  startFeatureCheckoutAction,
  startPackageCheckoutAction,
} from '@/features/packages/actions';
import { useRouter } from '@/lib/i18n/navigation';
import { cn } from '@/lib/utils';

/**
 * Startet eine Zahlung und schickt den Browser zur Bezahlseite.
 *
 * Die Adresse bestimmt der Anbieter: der Mock-Anbieter fuehrt auf eine eigene
 * Seite, deren Pfad hier in die aktive Sprache uebersetzt wird; ein echter
 * Anbieter liefert eine fremde Adresse, zu der unmittelbar gewechselt wird.
 *
 * Mit `vehicleId` wird eine Hervorhebung gebucht, ohne sie ein Paket.
 */
export function BuyButton({
  label,
  packageId,
  vehicleId,
  variant = 'default',
  className,
  disabled,
}: {
  label: string;
  packageId: string;
  vehicleId?: string;
  variant?: 'default' | 'outline';
  className?: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant={variant}
      disabled={disabled || isPending}
      className={cn('w-full', className)}
      onClick={() =>
        startTransition(async () => {
          const result = vehicleId
            ? await startFeatureCheckoutAction(vehicleId, packageId)
            : await startPackageCheckoutAction(packageId);

          if (!result.ok) {
            toast.error(result.error);
            return;
          }

          if (result.data.kind === 'external') {
            window.location.href = result.data.url;
            return;
          }

          router.push({
            pathname: '/checkout/[id]',
            params: { id: result.data.paymentId },
          });
        })
      }
    >
      {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
      {label}
    </Button>
  );
}
