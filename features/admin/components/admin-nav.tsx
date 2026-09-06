'use client';

import {
  BadgeCheck, Bug, Car, CreditCard, Flag, LayoutDashboard, Package, Settings, Store,
  Tags, Users,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link, usePathname } from '@/lib/i18n/navigation';
import { cn } from '@/lib/utils';

const ITEMS = [
  { href: '/admin', key: 'dashboard', icon: LayoutDashboard },
  { href: '/admin/vehicles', key: 'vehicles', icon: Car },
  { href: '/admin/reports', key: 'reports', icon: Flag },
  { href: '/admin/bugs', key: 'bugs', icon: Bug },
  { href: '/admin/verifications', key: 'verifications', icon: BadgeCheck },
  { href: '/admin/dealers', key: 'dealers', icon: Store },
  { href: '/admin/users', key: 'users', icon: Users },
  { href: '/admin/brands', key: 'brands', icon: Tags },
  { href: '/admin/packages', key: 'packages', icon: Package },
  { href: '/admin/payments', key: 'payments', icon: CreditCard },
  { href: '/admin/settings', key: 'settings', icon: Settings },
] as const;

export function AdminNav({
  openReports,
  openBugs,
  openVerifications,
}: {
  openReports: number;
  openBugs: number;
  openVerifications: number;
}) {
  const t = useTranslations('admin.nav');
  const pathname = usePathname();

  return (
    <nav aria-label="Admin" className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
      {ITEMS.map(({ href, key, icon: Icon }) => {
        // Die Übersicht darf nicht bei jeder Unterseite aktiv erscheinen.
        const active = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
            )}
          >
            <Icon className="size-4" aria-hidden />
            {t(key)}
            {badgeFor(key, openReports, openBugs, openVerifications) ? (
              <span className="bg-destructive text-destructive-foreground ms-auto inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold">
                {badgeFor(key, openReports, openBugs, openVerifications)}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

/** Zahl neben einem Eintrag, oder 0 fuer keine. */
function badgeFor(
  key: string,
  openReports: number,
  openBugs: number,
  openVerifications: number,
): number {
  if (key === 'reports') return openReports;
  if (key === 'bugs') return openBugs;
  if (key === 'verifications') return openVerifications;
  return 0;
}
