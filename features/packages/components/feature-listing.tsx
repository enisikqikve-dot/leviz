'use client';

import { Loader2, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { startFeatureCheckoutAction } from '@/features/packages/actions';
import { useRouter } from '@/lib/i18n/navigation';

export type FeatureOption = {
  packageId: string;
  days: number;
  price: string;
};

/**
 * Buchung einer Hervorhebung direkt aus der eigenen Inseratsliste.
 *
 * Laeuft bereits eine Hervorhebung, steht hier ihr Enddatum statt der
 * Schaltflaechen — eine zweite Buchung waere zwar moeglich und wuerde
 * verlaengern, aber der Hinweis ist im Alltag die nuetzlichere Auskunft.
 */
export function FeatureListing({
  vehicleId,
  featuredUntil,
  options,
}: {
  vehicleId: string;
  featuredUntil: string | null;
  options: FeatureOption[];
}) {
  const t = useTranslations('feature');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (featuredUntil) {
    return (
      <p className="text-featured-foreground bg-featured/15 mt-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium">
        <Sparkles className="size-3.5" aria-hidden />
        {t('active', { date: featuredUntil })}
      </p>
    );
  }

  if (options.length === 0) return null;

  const book = (packageId: string) =>
    startTransition(async () => {
      const result = await startFeatureCheckoutAction(vehicleId, packageId);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      if (result.data.kind === 'external') {
        window.location.href = result.data.url;
        return;
      }

      router.push({ pathname: '/checkout/[id]', params: { id: result.data.paymentId } });
    });

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {options.map((option) => (
        <Button
          key={option.packageId}
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => book(option.packageId)}
        >
          {isPending ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <Sparkles className="size-3.5" aria-hidden />
          )}
          {t('book')} · {t('days', { days: option.days })} · {option.price}
        </Button>
      ))}
    </div>
  );
}
