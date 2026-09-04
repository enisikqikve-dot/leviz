'use client';

import { Heart } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useOptimistic, useTransition } from 'react';
import { toast } from 'sonner';

import { toggleFavoriteAction } from '@/features/favorites/actions';
import { useRouter } from '@/lib/i18n/navigation';
import { cn } from '@/lib/utils';

export function FavoriteButton({
  vehicleId,
  initialFavorited,
  className,
}: {
  vehicleId: string;
  initialFavorited: boolean;
  className?: string;
}) {
  const t = useTranslations('nav');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Das Herz reagiert sofort; die Server-Antwort korrigiert es bei Bedarf.
  const [favorited, setFavorited] = useOptimistic(initialFavorited);

  function toggle(event: React.MouseEvent) {
    // Die Karte ist ein Link — der Klick darf nicht zur Detailseite fuehren.
    event.preventDefault();
    event.stopPropagation();

    startTransition(async () => {
      setFavorited(!favorited);
      const result = await toggleFavoriteAction(vehicleId);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      if (result.data.requiresLogin) {
        router.push('/login');
        return;
      }

      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isPending}
      aria-pressed={favorited}
      aria-label={t('favorites')}
      className={cn(
        'inline-flex size-9 items-center justify-center rounded-full transition-colors',
        'bg-white/90 text-foreground backdrop-blur-sm hover:bg-white',
        'dark:bg-black/50 dark:text-white dark:hover:bg-black/70',
        'disabled:opacity-70',
        className,
      )}
    >
      <Heart
        className={cn('size-4 transition-colors', favorited && 'fill-destructive text-destructive')}
        aria-hidden
      />
    </button>
  );
}
