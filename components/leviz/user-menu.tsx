'use client';

import {
  Car, Heart, LayoutDashboard, LogOut, MessageSquare, Settings, ShieldCheck,
} from 'lucide-react';
import { signOut } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { useTransition } from 'react';

import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Link, useRouter } from '@/lib/i18n/navigation';

const LINKS = [
  { href: '/dashboard', key: 'dashboard', icon: LayoutDashboard },
  { href: '/dashboard/listings', key: 'listings', icon: Car },
  { href: '/favorites', key: 'favorites', icon: Heart },
  { href: '/messages', key: 'messages', icon: MessageSquare },
  { href: '/dashboard/settings', key: 'settings', icon: Settings },
] as const;

/**
 * Konto-Menü in der Kopfzeile, sobald jemand angemeldet ist.
 *
 * Der Zugang zur Verwaltung steht hier und nicht in der öffentlichen
 * Navigation: er geht nur Verwalter etwas an, und eine Schaltfläche, die für
 * alle anderen mit 403 endet, ist keine Navigation.
 */
export function UserMenu({ name, isAdmin }: { name: string; isAdmin: boolean }) {
  const t = useTranslations('nav');
  const ta = useTranslations('admin');
  const td = useTranslations('dashboard');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const initials = name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t('dashboard')}
        className="bg-primary text-primary-foreground inline-flex size-9 items-center justify-center rounded-full text-xs font-semibold transition-opacity hover:opacity-90"
      >
        {initials || '·'}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-52">
        <p className="text-muted-foreground truncate px-2 py-1.5 text-xs">{name}</p>
        <DropdownMenuSeparator />

        {isAdmin ? (
          <>
            <DropdownMenuItem asChild>
              <Link href="/admin" className="cursor-pointer font-medium">
                <ShieldCheck className="size-4" aria-hidden />
                {ta('title')}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        ) : null}

        {LINKS.map(({ href, key, icon: Icon }) => (
          <DropdownMenuItem key={href} asChild>
            <Link href={href} className="cursor-pointer">
              <Icon className="size-4" aria-hidden />
              {key === 'listings' ? td('myListings') : key === 'settings' ? td('settings') : t(key)}
            </Link>
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={isPending}
          onSelect={() =>
            startTransition(async () => {
              // Siehe logout-button.tsx: die Weiterleitung macht der Browser,
              // nicht der Server.
              await signOut({ redirect: false });
              router.push('/');
              router.refresh();
            })
          }
          className="cursor-pointer"
        >
          <LogOut className="size-4" aria-hidden />
          {t('logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
