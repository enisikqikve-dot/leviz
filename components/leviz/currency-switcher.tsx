'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useTransition } from 'react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { setCurrencyAction } from '@/features/settings/actions';
import { CURRENCIES, type Currency } from '@/lib/currency';
import { cn } from '@/lib/utils';

const SYMBOL: Record<Currency, string> = { EUR: '€', ALL: 'L' };

export function CurrencySwitcher({
  current,
  className,
}: {
  current: Currency;
  className?: string;
}) {
  const t = useTranslations('settings');
  const tCurrencies = useTranslations('currencies');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function select(next: Currency) {
    startTransition(async () => {
      await setCurrencyAction(next);
      // Preise entstehen serverseitig, darum die Baumstruktur neu anfordern.
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t('changeCurrency')}
        disabled={isPending}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium',
          'transition-colors hover:bg-white/10 focus-visible:bg-white/10 disabled:opacity-60',
          className,
        )}
      >
        <span aria-hidden className="text-base leading-none">
          {SYMBOL[current]}
        </span>
        <span>{current}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        {CURRENCIES.map((item) => (
          <DropdownMenuItem
            key={item}
            onSelect={() => select(item)}
            className={cn('cursor-pointer', item === current && 'font-semibold')}
          >
            <span className="text-muted-foreground w-6 text-center">{SYMBOL[item]}</span>
            {tCurrencies(item)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
