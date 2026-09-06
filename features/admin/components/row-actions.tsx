'use client';

import { BadgeCheck, Loader2, ShieldOff, Star, UserCheck, UserX } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  setDealerVerificationAction, setUserVerificationAction, suspendUserAction,
  toggleBrandPopularAction, unsuspendUserAction,
} from '@/features/admin/actions';
import { useRouter } from '@/lib/i18n/navigation';
import { cn } from '@/lib/utils';

/** Gemeinsame Ausführung: Fehler anzeigen, sonst neu laden. */
function useRunner() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const run = (action: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      const result = await action();
      if (!result.ok) toast.error(result.error ?? '');
      else router.refresh();
    });

  return { run, isPending };
}

export function DealerVerifyButton({
  dealerId,
  verified,
}: {
  dealerId: string;
  verified: boolean;
}) {
  const t = useTranslations('admin.dealers');
  const { run, isPending } = useRunner();

  return (
    <Button
      variant={verified ? 'outline' : 'default'}
      className="h-9"
      disabled={isPending}
      onClick={() => run(() => setDealerVerificationAction(dealerId, !verified))}
    >
      {isPending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : verified ? (
        <ShieldOff className="size-4" aria-hidden />
      ) : (
        <BadgeCheck className="size-4" aria-hidden />
      )}
      {verified ? t('revoke') : t('verify')}
    </Button>
  );
}

/**
 * Erkennt eine Person mit einem Klick als geprüft an.
 *
 * Steht neben dem Weg über eingereichte Papiere, nicht an seiner Stelle: für
 * jemanden, dessen Unterlagen längst auf dem Tisch lagen, wäre es sinnlos,
 * ihn um einen Upload zu bitten.
 */
export function UserVerifyButton({
  userId,
  verified,
}: {
  userId: string;
  verified: boolean;
}) {
  const t = useTranslations('admin.users');
  const { run, isPending } = useRunner();

  return (
    <Button
      variant={verified ? 'outline' : 'default'}
      className="h-9"
      disabled={isPending}
      title={verified ? t('revokeVerification') : t('verifyNow')}
      onClick={() => run(() => setUserVerificationAction(userId, !verified))}
    >
      {isPending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : verified ? (
        <ShieldOff className="size-4" aria-hidden />
      ) : (
        <BadgeCheck className="size-4" aria-hidden />
      )}
      {verified ? t('revokeVerification') : t('verifyNow')}
    </Button>
  );
}

export function UserSuspendButton({
  userId,
  suspended,
  disabled,
}: {
  userId: string;
  suspended: boolean;
  /** Administratoren und das eigene Konto lassen sich nicht sperren. */
  disabled?: boolean;
}) {
  const t = useTranslations('admin.users');
  const { run, isPending } = useRunner();

  if (disabled) return null;

  return (
    <Button
      variant={suspended ? 'outline' : 'ghost'}
      className={cn('h-9', !suspended && 'text-destructive hover:text-destructive')}
      disabled={isPending}
      onClick={() => {
        if (suspended) {
          run(() => unsuspendUserAction(userId));
          return;
        }

        const reason = window.prompt(t('suspendReason'));
        if (reason && reason.trim().length >= 3) {
          run(() => suspendUserAction({ userId, reason }));
        }
      }}
    >
      {isPending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : suspended ? (
        <UserCheck className="size-4" aria-hidden />
      ) : (
        <UserX className="size-4" aria-hidden />
      )}
      {suspended ? t('unsuspend') : t('suspend')}
    </Button>
  );
}

export function BrandPopularToggle({
  brandId,
  popular,
}: {
  brandId: string;
  popular: boolean;
}) {
  const t = useTranslations('admin.brands');
  const { run, isPending } = useRunner();

  return (
    <button
      type="button"
      aria-pressed={popular}
      aria-label={t('togglePopular')}
      disabled={isPending}
      onClick={() => run(() => toggleBrandPopularAction(brandId))}
      className="hover:bg-muted inline-flex size-9 items-center justify-center rounded-md transition-colors disabled:opacity-60"
    >
      <Star
        className={cn('size-4', popular ? 'text-featured fill-current' : 'text-muted-foreground')}
        aria-hidden
      />
    </button>
  );
}
