import type { Metadata } from 'next';
import {
  BadgeCheck, Bookmark, Car, Heart, MessageSquare, Settings, Upload,
} from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Badge } from '@/components/ui/badge';
import { LogoutButton } from '@/features/dashboard/components/logout-button';
import { requireUser } from '@/lib/auth/guards';
import { prisma } from '@/lib/db';
import { formatPhone } from '@/features/auth/phone';
import { Link } from '@/lib/i18n/navigation';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'dashboard' });
  return { title: t('title'), robots: { index: false } };
}

/**
 * Der Bestandsimport steht nur bei Haendlerkonten.
 *
 * Ein Privatverkaeufer mit einem Auto hat nichts zu importieren; die Kachel
 * waere fuer ihn eine Sackgasse mit Erklaerung.
 */
const DEALER_SECTIONS = [
  { href: '/dashboard/import', key: 'importListings', icon: Upload },
] as const;

const SECTIONS = [
  { href: '/dashboard/listings', key: 'myListings', icon: Car },
  { href: '/favorites', key: 'myFavorites', icon: Heart },
  { href: '/messages', key: 'myMessages', icon: MessageSquare },
  { href: '/searches', key: 'mySearches', icon: Bookmark },
  { href: '/dashboard/verification', key: 'verification', icon: BadgeCheck },
  { href: '/dashboard/settings', key: 'settings', icon: Settings },
] as const;

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Serverseitiger Waechter. Ohne gueltige Sitzung endet die Seite hier.
  const sessionUser = await requireUser();

  const t = await getTranslations('dashboard');

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: sessionUser.id },
    select: {
      name: true, email: true, phone: true, role: true, createdAt: true,
      dealer: { select: { id: true } },
    },
  });

  const displayName = user.name ?? user.email ?? (user.phone ? formatPhone(user.phone) : '');

  return (
    <div className="lv-container py-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {t('greeting', { name: displayName })}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{t(`roles.${user.role}`)}</Badge>
            <span className="text-muted-foreground text-sm">
              {t('memberSince')}{' '}
              {new Intl.DateTimeFormat(locale === 'sq' ? 'sq-AL' : locale, {
                dateStyle: 'long',
              }).format(user.createdAt)}
            </span>
          </div>
        </div>
        <LogoutButton label={t('logout')} />
      </div>

      <dl className="bg-surface mt-8 grid gap-4 rounded-xl border p-6 sm:grid-cols-2">
        {user.email ? (
          <div>
            <dt className="text-muted-foreground text-xs">{t('email')}</dt>
            <dd className="mt-0.5 text-sm font-medium">{user.email}</dd>
          </div>
        ) : null}
        {user.phone ? (
          <div>
            <dt className="text-muted-foreground text-xs">{t('phone')}</dt>
            <dd className="mt-0.5 text-sm font-medium">{formatPhone(user.phone)}</dd>
          </div>
        ) : null}
      </dl>

      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...(user.dealer ? DEALER_SECTIONS : []), ...SECTIONS].map(({ href, key, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className="bg-card text-card-foreground shadow-card hover:shadow-card-hover flex items-center gap-4 rounded-xl border p-5 transition-shadow"
            >
              <span className="bg-primary/10 text-primary inline-flex size-10 shrink-0 items-center justify-center rounded-lg">
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="text-sm font-medium">{t(key)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
