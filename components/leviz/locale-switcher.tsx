'use client';

import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Globe } from 'lucide-react';
import { useTransition } from 'react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePathname, useRouter } from '@/lib/i18n/navigation';
import { locales, type Locale } from '@/lib/i18n/routing';
import { cn } from '@/lib/utils';

const SHORT: Record<Locale, string> = { sq: 'SQ', de: 'DE', en: 'EN' };

export function LocaleSwitcher({ className }: { className?: string }) {
  const t = useTranslations('settings');
  const tLocales = useTranslations('locales');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [isPending, startTransition] = useTransition();

  function select(next: Locale) {
    startTransition(() => {
      // Der Pfad wird beim Wechsel automatisch in die Zielsprache übersetzt.
      router.replace(
        // @ts-expect-error -- `params` ist erst zur Laufzeit auf die Route bezogen.
        { pathname, params },
        { locale: next },
      );
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t('changeLanguage')}
        disabled={isPending}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium',
          'hover:bg-white/10 focus-visible:bg-white/10 disabled:opacity-60',
          'transition-colors',
          className,
        )}
      >
        <Globe className="size-4" aria-hidden />
        <span>{SHORT[locale]}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        {locales.map((item) => (
          <DropdownMenuItem
            key={item}
            onSelect={() => select(item)}
            className={cn('cursor-pointer', item === locale && 'font-semibold')}
          >
            <span className="text-muted-foreground w-6 text-xs">{SHORT[item]}</span>
            {tLocales(item)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
