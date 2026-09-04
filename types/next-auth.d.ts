import type { UserRole, UserStatus } from '@/lib/generated/prisma/enums';
import type { DefaultSession } from 'next-auth';

/**
 * In Auth.js v5 liegen die zu erweiternden Schnittstellen in @auth/core.
 * `next-auth` reicht sie nur weiter, darum werden beide Pfade ergaenzt.
 */
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      status: UserStatus;
      dealerId: string | null;
    } & DefaultSession['user'];
  }

  interface User {
    role?: UserRole;
    status?: UserStatus;
    dealerId?: string | null;
  }
}

declare module '@auth/core/types' {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      status: UserStatus;
      dealerId: string | null;
    } & DefaultSession['user'];
  }

  interface User {
    role?: UserRole;
    status?: UserStatus;
    dealerId?: string | null;
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    id: string;
    role: UserRole;
    status: UserStatus;
    dealerId: string | null;
  }
}
