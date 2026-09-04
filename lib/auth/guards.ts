import { cache } from 'react';

import { forbidden, redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import type { UserRole } from '@/lib/generated/prisma/enums';
import { getPathname } from '@/lib/i18n/navigation';

export type SessionUser = {
  id: string;
  role: UserRole;
  dealerId: string | null;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

/** Rollen, die den gesamten Bestand verwalten duerfen. */
const ADMIN_ROLES: readonly UserRole[] = ['ADMIN', 'SUPER_ADMIN'];

/**
 * Nachschlagen des Kontos zum Token.
 *
 * Rolle und Sperrstatus stehen zwar im Token, werden dort aber nur beim
 * Anmelden und beim ausdruecklichen Aktualisieren gesetzt. Ein bereits
 * ausgestelltes Token behielte seine Rechte sonst bis zum Ablauf — eine
 * Sperrung bliebe folgenlos, und ein geloeschtes Konto liefe beim Schreiben
 * in einen Fremdschluesselfehler. Deshalb entscheidet die Datenbank.
 *
 * `cache` buendelt die Abfrage pro Anfrage, sodass mehrere Waechter in
 * derselben Darstellung nur einmal nachschlagen.
 */
const loadAccount = cache(async (userId: string) =>
  prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      status: true,
      name: true,
      email: true,
      image: true,
      dealer: { select: { id: true } },
    },
  }),
);

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const account = await loadAccount(session.user.id);
  // Konto geloescht oder gesperrt: das Token gilt nicht mehr.
  if (!account || account.status !== 'ACTIVE') return null;

  return {
    id: account.id,
    role: account.role,
    dealerId: account.dealer?.id ?? null,
    name: account.name,
    email: account.email,
    image: account.image,
  };
}

/**
 * Diese Waechter sind die einzige Autorisierungsquelle. Jede Server Action und
 * jede geschuetzte Seite ruft einen davon auf, bevor sie irgendetwas tut —
 * das Ausblenden von Schaltflaechen im Browser ist kein Schutz.
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();

  if (!user) {
    // Weiterleitung statt 401-Seite: Wer nicht angemeldet ist, soll sich
    // anmelden koennen und nicht in einer Sackgasse landen.
    const locale = await getLocale();
    // getPathname liefert den uebersetzten Pfad (/hyr, /de/anmelden, /en/login);
    // Nexts redirect ist als never typisiert und beendet die Ausfuehrung hier.
    redirect(getPathname({ href: '/login', locale }));
  }

  return user;
}

export async function requireRole(...roles: UserRole[]): Promise<SessionUser> {
  const user = await requireUser();
  // Angemeldet, aber ohne Berechtigung: hier ist 403 die richtige Antwort.
  if (!roles.includes(user.role)) forbidden();
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  return requireRole(...ADMIN_ROLES);
}

export async function requireSuperAdmin(): Promise<SessionUser> {
  return requireRole('SUPER_ADMIN');
}

export async function requireDealer(): Promise<SessionUser & { dealerId: string }> {
  const user = await requireUser();
  if (!user.dealerId) forbidden();
  return user as SessionUser & { dealerId: string };
}

export function isAdmin(user: Pick<SessionUser, 'role'>): boolean {
  return ADMIN_ROLES.includes(user.role);
}

/**
 * Besitzpruefung fuer Inserate und andere eigene Inhalte. Verwaltende Rollen
 * duerfen ueberall eingreifen, alle anderen nur an eigenen Datensaetzen.
 */
export function canManage(
  user: Pick<SessionUser, 'id' | 'role' | 'dealerId'>,
  resource: { sellerId: string; dealerId?: string | null },
): boolean {
  if (isAdmin(user)) return true;
  if (resource.sellerId === user.id) return true;
  return Boolean(user.dealerId) && resource.dealerId === user.dealerId;
}
