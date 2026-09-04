'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useTranslations } from 'next-intl';
import { useSyncExternalStore } from 'react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const OPTIONS = [
  { value: 'light', icon: Sun, label: 'themeLight' },
  { value: 'dark', icon: Moon, label: 'themeDark' },
  { value: 'system', icon: Monitor, label: 'themeSystem' },
] as const;

const noopSubscribe = () => () => {};

/**
 * Das aktive Theme steht erst im Browser fest. `useSyncExternalStore` liefert
 * serverseitig `false` und clientseitig `true`, ohne im Effekt State zu setzen —
 * damit gibt es weder Hydrations-Konflikt noch Kaskadenrender.
 */
function useIsClient() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

export function ThemeToggle({ className }: { className?: string }) {
  const t = useTranslations('settings');
  const { theme, setTheme } = useTheme();
  const isClient = useIsClient();

  const Active = isClient
    ? (OPTIONS.find((option) => option.value === theme)?.icon ?? Monitor)
    : Monitor;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t('toggleTheme')}
        className={cn(
          'inline-flex items-center rounded-md p-2 transition-colors',
          'hover:bg-white/10 focus-visible:bg-white/10',
          className,
        )}
      >
        <Active className="size-4" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        {OPTIONS.map(({ value, icon: Icon, label }) => (
          <DropdownMenuItem
            key={value}
            onSelect={() => setTheme(value)}
            className={cn(
              'cursor-pointer',
              isClient && theme === value && 'font-semibold',
            )}
          >
            <Icon className="size-4" aria-hidden />
            {t(label)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
