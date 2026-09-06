'use client';

import { KeyRound, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { sendPasswordResetForUserAction } from '@/features/admin/actions';

/**
 * Schickt dem Konto einen Link zum Zurücksetzen.
 *
 * Kein Knopf „Passwort anzeigen" und keiner „Passwort setzen": das eine ist
 * unmöglich, das andere wäre gefährlich. Siehe die Begründung an der Aktion.
 */
export function ResetPasswordButton({
  userId,
  hasEmail,
}: {
  userId: string;
  hasEmail: boolean;
}) {
  const t = useTranslations('admin.userDetail');
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      disabled={pending || !hasEmail}
      title={hasEmail ? undefined : t('noEmail')}
      onClick={() =>
        startTransition(async () => {
          const result = await sendPasswordResetForUserAction(userId);

          if (!result.ok) {
            toast.error(result.error === 'errorNoEmail' ? t('noEmail') : result.error);
            return;
          }

          toast.success(t('resetSent'));
        })
      }
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        <KeyRound className="size-4" aria-hidden />
      )}
      {t('sendReset')}
    </Button>
  );
}
