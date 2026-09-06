'use client';

import { LogOut } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { useRouter } from '@/lib/i18n/navigation';

export function LogoutButton({ label }: { label: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  /**
   * Abmelden, dann selbst weiterleiten.
   *
   * `redirectTo` ueberliesse die Weiterleitung dem Server, und der muss dafuer
   * seine eigene oeffentliche Adresse kennen. Hinter einem Webserver im
   * Container weiss er sie nur, wenn AUTH_URL gesetzt ist -- fehlt sie, landet
   * der Nutzer auf der Bindeadresse des Containers. Ein Klick im Browser
   * braucht diese Kenntnis gar nicht.
   */
  const logout = () =>
    startTransition(async () => {
      await signOut({ redirect: false });
      router.push('/');
      router.refresh();
    });

  return (
    <Button variant="outline" disabled={isPending} onClick={logout}>
      <LogOut className="size-4" aria-hidden />
      {label}
    </Button>
  );
}
