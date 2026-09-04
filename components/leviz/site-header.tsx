import { GitCompare, Heart, MessageSquare, Plus } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { CurrencySwitcher } from '@/components/leviz/currency-switcher';
import { LevizLogo } from '@/components/leviz/logo';
import { LocaleSwitcher } from '@/components/leviz/locale-switcher';
import { MobileNav } from '@/components/leviz/mobile-nav';
import { ThemeToggle } from '@/components/leviz/theme-toggle';
import { UserMenu } from '@/components/leviz/user-menu';
import { getCompareIds } from '@/features/compare/server';
import { countUnreadConversations } from '@/features/messages/queries';
import { getSessionUser } from '@/lib/auth/guards';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { Currency } from '@/lib/currency';
import { Link } from '@/lib/i18n/navigation';

const NAV = [
  { href: '/search', key: 'search' },
  { href: '/dealers', key: 'dealers' },
  { href: '/pricing', key: 'pricing' },
] as const;



export async function SiteHeader({ currency }: { currency: Currency }) {
  const t = await getTranslations('nav');
  const user = await getSessionUser();

  const [compareIds, unread] = await Promise.all([
    getCompareIds(),
    user ? countUnreadConversations(user.id) : Promise.resolve(0),
  ]);

  // Zähler nur zeigen, wenn es etwas zu zählen gibt.
  const iconNav = [
    { href: '/favorites' as const, key: 'favorites', icon: Heart, count: 0 },
    { href: '/compare' as const, key: 'compare', icon: GitCompare, count: compareIds.length },
    { href: '/messages' as const, key: 'messages', icon: MessageSquare, count: unread },
  ];

  return (
    <header className="bg-ink text-ink-foreground sticky top-0 z-40">
      <div className="lv-container flex h-16 items-center gap-4">
        <Link href="/" aria-label="LEVIZ" className="shrink-0">
          <LevizLogo />
        </Link>

        <nav
          aria-label={t('mainNavigation')}
          className="ms-2 hidden items-center gap-1 lg:flex"
        >
          {NAV.map(({ href, key }) => (
            <Link
              key={href}
              href={href}
              className="rounded-md px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              {t(key)}
            </Link>
          ))}
        </nav>

        <div className="ms-auto flex items-center gap-1">
          <div className="hidden items-center gap-1 md:flex">
            {iconNav.map(({ href, key, icon: Icon, count }) => (
              <Link
                key={href}
                href={href}
                aria-label={t(key)}
                title={t(key)}
                className="relative rounded-md p-2 transition-colors hover:bg-white/10"
              >
                <Icon className="size-4" aria-hidden />
                {count > 0 ? (
                  <span
                    className={cn(
                      'absolute end-0.5 top-0.5 inline-flex min-w-4 items-center justify-center',
                      'rounded-full px-1 text-[10px] font-semibold leading-4',
                      'bg-primary text-primary-foreground',
                    )}
                  >
                    {count}
                  </span>
                ) : null}
              </Link>
            ))}
          </div>

          <div className="hidden items-center gap-0.5 sm:flex">
            <CurrencySwitcher current={currency} />
            <LocaleSwitcher />
            <ThemeToggle />
          </div>

          <div className="ms-1 hidden items-center gap-2 lg:flex">
            {/* Angemeldete Nutzer sehen ihr Konto, nicht die Anmeldung. */}
            {user ? (
              <>
                <Button asChild>
                  <Link href="/sell/create">
                    <Plus className="size-4" aria-hidden />
                    {t('sell')}
                  </Link>
                </Button>
                <UserMenu name={user.name ?? user.email ?? 'LEVIZ'} />
              </>
            ) : (
              <>
                <Button
                  asChild
                  variant="ghost"
                  className="text-white hover:bg-white/10 hover:text-white"
                >
                  <Link href="/login">{t('login')}</Link>
                </Button>
                <Button asChild>
                  <Link href="/sell/create">
                    <Plus className="size-4" aria-hidden />
                    {t('sell')}
                  </Link>
                </Button>
              </>
            )}
          </div>

          {/* Auf kleinen Bildschirmen liegt das Konto in der Schublade. */}
          {user ? (
            <div className="lg:hidden">
              <UserMenu name={user.name ?? user.email ?? 'LEVIZ'} />
            </div>
          ) : null}

          <MobileNav />
        </div>
      </div>
    </header>
  );
}
