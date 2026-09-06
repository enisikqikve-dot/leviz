import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { UserSuspendButton } from '@/features/admin/components/row-actions';
import { Link } from '@/lib/i18n/navigation';
import { listUsersForAdmin } from '@/features/admin/queries';
import { formatPhone } from '@/features/auth/phone';
import { formatDate } from '@/features/vehicles/format';
import { requireAdmin } from '@/lib/auth/guards';
import type { Locale } from '@/lib/i18n/routing';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { robots: { index: false } };

const ROLE_TONE: Record<string, string> = {
  SUPER_ADMIN: 'bg-primary/10 text-primary',
  ADMIN: 'bg-primary/10 text-primary',
  DEALER: 'bg-featured/15 text-featured-foreground dark:text-featured',
  PRIVATE_SELLER: 'bg-muted text-muted-foreground',
  USER: 'bg-muted text-muted-foreground',
};

export default async function AdminUsersPage({
  params,
  searchParams,
}: PageProps<'/[locale]/admin/users'>) {
  const { locale } = await params;
  const raw = await searchParams;
  const query = typeof raw.q === 'string' ? raw.q : undefined;

  const admin = await requireAdmin();
  const t = await getTranslations('admin.users');
  const td = await getTranslations('dashboard');

  const users = await listUsersForAdmin(query);

  return (
    <div>
      <h2 className="text-lg font-semibold">{t('title')}</h2>

      {/* Einfaches GET-Formular: die Suche bleibt in der Adresszeile teilbar. */}
      <form className="mt-4">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder={t('search')}
          aria-label={t('search')}
          className="border-input bg-background focus-visible:ring-ring h-11 w-full max-w-md rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none"
        />
      </form>

      <ul className="mt-4 space-y-2">
        {users.map((user) => {
          const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';

          return (
            <li
              key={user.id}
              className="bg-card flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Der Name fuehrt ins Profil: von der Liste aus laesst sich
                      ein Konto sonst nur sperren, nicht ansehen. */}
                  <Link
                    href={{ pathname: '/admin/users/[id]', params: { id: user.id } }}
                    className="truncate font-semibold hover:underline"
                  >
                    {user.name ?? user.email ?? '—'}
                  </Link>
                  <span
                    className={cn(
                      'rounded-md px-2 py-0.5 text-xs font-medium',
                      ROLE_TONE[user.role] ?? 'bg-muted',
                    )}
                  >
                    {td(`roles.${user.role}`)}
                  </span>
                  {user.status === 'SUSPENDED' ? (
                    <span className="bg-destructive/10 text-destructive rounded-md px-2 py-0.5 text-xs font-medium">
                      {t('suspend')}
                    </span>
                  ) : null}
                </div>

                <p className="text-muted-foreground mt-1 truncate text-sm">
                  {user.email ?? (user.phone ? formatPhone(user.phone) : '—')}
                </p>

                <p className="text-muted-foreground mt-1 text-xs">
                  {t('joined')} {formatDate(user.createdAt, locale as Locale)} ·{' '}
                  {user._count.vehicles} {t('listings')}
                  {user.suspendedReason ? ` · ${user.suspendedReason}` : ''}
                </p>
              </div>

              <UserSuspendButton
                userId={user.id}
                suspended={user.status === 'SUSPENDED'}
                disabled={isAdmin || user.id === admin.id}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
