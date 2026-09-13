import type { UserRole } from '@/lib/generated/prisma/enums';

/**
 * Wer handelt -- das Mindeste, was eine Besitzpruefung wissen muss.
 *
 * Bewusst ohne Next-Importe: diese Datei wird von den Kernen der Fachlogik
 * gebraucht, und die laufen fuer Website (Cookie) und App (Token) gleich.
 * `SessionUser` aus den Waechtern und `ApiUser` aus der API erfuellen beide
 * diese Form.
 */
export type Actor = {
  id: string;
  role: UserRole;
  dealerId: string | null;
};

/** Rollen, die den gesamten Bestand verwalten duerfen. */
export const ADMIN_ROLES: readonly UserRole[] = ['ADMIN', 'SUPER_ADMIN'];

export function isAdmin(user: Pick<Actor, 'role'>): boolean {
  return ADMIN_ROLES.includes(user.role);
}

/**
 * Besitzpruefung fuer Inserate und andere eigene Inhalte. Verwaltende Rollen
 * duerfen ueberall eingreifen, alle anderen nur an eigenen Datensaetzen --
 * Haendler auch an denen ihres Autohauses.
 */
export function canManage(
  user: Actor,
  resource: { sellerId: string; dealerId?: string | null },
): boolean {
  if (isAdmin(user)) return true;
  if (resource.sellerId === user.id) return true;
  return Boolean(user.dealerId) && resource.dealerId === user.dealerId;
}
