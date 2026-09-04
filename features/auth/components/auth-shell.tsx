import type { ReactNode } from 'react';

import { LevizIcon } from '@/components/leviz/logo';
import { Link } from '@/lib/i18n/navigation';

/** Gemeinsamer Rahmen aller Anmelde- und Registrierungsseiten. */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="lv-container flex min-h-[calc(100dvh-4rem)] items-center justify-center py-12">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center">
          <Link href="/" aria-label="LEVIZ">
            <LevizIcon className="size-12" />
          </Link>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-muted-foreground mt-2 text-sm">{subtitle}</p>
        </div>

        <div className="bg-card text-card-foreground shadow-card mt-8 rounded-2xl border p-6 sm:p-8">
          {children}
        </div>

        {footer ? (
          <div className="text-muted-foreground mt-6 text-center text-sm">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
