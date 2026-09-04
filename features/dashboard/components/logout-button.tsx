'use client';

import { LogOut } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { useTransition } from 'react';

import { Button } from '@/components/ui/button';

export function LogoutButton({ label }: { label: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      disabled={isPending}
      onClick={() => startTransition(() => void signOut({ redirectTo: '/' }))}
    >
      <LogOut className="size-4" aria-hidden />
      {label}
    </Button>
  );
}
