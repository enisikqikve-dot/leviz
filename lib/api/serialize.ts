import type { ApiUser } from './auth';

/**
 * Was die App ueber ein Konto erfaehrt.
 *
 * Bewusst eine feste Liste statt "alles ausser passwordHash": ein neues
 * Feld am Nutzer landet sonst automatisch in jeder Antwort, ob es dorthin
 * gehoert oder nicht.
 */
export type AccountPayload = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  image: string | null;
  role: ApiUser['role'];
  locale: string;
  dealer: { id: string; slug: string; companyName: string; verified: boolean } | null;
  createdAt: string;
};

export function accountPayload(user: {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  image: string | null;
  role: ApiUser['role'];
  locale: string;
  createdAt: Date;
  dealer: { id: string; slug: string; companyName: string; verification: string } | null;
}): AccountPayload {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    image: user.image,
    role: user.role,
    locale: user.locale,
    dealer: user.dealer
      ? {
          id: user.dealer.id,
          slug: user.dealer.slug,
          companyName: user.dealer.companyName,
          verified: user.dealer.verification === 'VERIFIED',
        }
      : null,
    createdAt: user.createdAt.toISOString(),
  };
}

/** Die Felder, die `accountPayload` braucht -- fuer jede Nutzerabfrage gleich. */
export const ACCOUNT_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  image: true,
  role: true,
  locale: true,
  createdAt: true,
  dealer: { select: { id: true, slug: true, companyName: true, verification: true } },
} as const;
