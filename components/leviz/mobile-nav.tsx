'use client';

import { Heart, MessageSquare, Menu, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { LevizLogo } from '@/components/leviz/logo';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Link } from '@/lib/i18n/navigation';

const PRIMARY = [
  { href: '/search', key: 'search' },
  { href: '/dealers', key: 'dealers' },
  { href: '/pricing', key: 'pricing' },
] as const;

const SECONDARY = [
  { href: '/favorites', key: 'favorites', icon: Heart },
  { href: '/messages', key: 'messages', icon: MessageSquare },
] as const;

export function MobileNav() {
  const t = useTranslations('nav');
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label={t('openMenu')}
        className="inline-flex items-center rounded-md p-2 transition-colors hover:bg-white/10 lg:hidden"
      >
        <Menu className="size-5" aria-hidden />
      </SheetTrigger>
      <SheetContent side="right" className="w-[min(20rem,85vw)] p-0">
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="text-left">
            <LevizLogo className="text-foreground" />
          </SheetTitle>
        </SheetHeader>

        <nav aria-label={t('mainNavigation')} className="flex flex-col px-3 py-4">
          {PRIMARY.map(({ href, key }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="hover:bg-muted rounded-lg px-3 py-3 text-base font-medium transition-colors"
            >
              {t(key)}
            </Link>
          ))}

          <Separator className="my-3" />

          {SECONDARY.map(({ href, key, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="hover:bg-muted flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium transition-colors"
            >
              <Icon className="text-muted-foreground size-4" aria-hidden />
              {t(key)}
            </Link>
          ))}

          <Separator className="my-3" />

          <div className="flex flex-col gap-2 px-1">
            <Button asChild size="lg">
              <Link href="/sell/create" onClick={() => setOpen(false)}>
                <Plus className="size-4" aria-hidden />
                {t('sell')}
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/login" onClick={() => setOpen(false)}>
                {t('login')}
              </Link>
            </Button>
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
