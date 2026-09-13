import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { api, ApiError, tokenStore } from './api';
import type { Account, SessionResponse } from './types';

/**
 * Wer ist angemeldet?
 *
 * Das Konto ist eine Abfrage wie jede andere: beim Start werden die Token aus
 * dem Schluesselbund geholt und /me geladen. Bis dahin ist `ready` falsch --
 * die Oberflaeche zeigt in der Zeit weder Anmeldeformular noch Konto, sondern
 * wartet. Sonst blitzt beim Start kurz "Anmelden" auf, obwohl man es ist.
 *
 * Nach Anmeldung, Registrierung und Abmeldung wird die Abfrage direkt
 * gesetzt statt neu geladen -- die Antwort der API enthaelt das Konto schon.
 */
type AuthState = {
  ready: boolean;
  user: Account | null;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
};

export type RegisterInput = {
  accountType: 'PRIVATE' | 'DEALER';
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: true;
  companyName?: string;
  registrationNumber?: string;
  locale: string;
};

const AuthContext = createContext<AuthState | null>(null);

async function ladeKonto(): Promise<Account | null> {
  const tokens = await tokenStore.load();
  if (!tokens) return null;

  try {
    return await api<Account>('/me');
  } catch (fehler) {
    // Abgelaufen und nicht erneuerbar: abgemeldet, ohne Drama.
    if (fehler instanceof ApiError && fehler.status === 401) {
      await tokenStore.clear();
      return null;
    }
    throw fehler;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const { data, isPending } = useQuery({
    queryKey: ['me'],
    queryFn: ladeKonto,
    staleTime: Infinity,
    retry: false,
  });

  const value = useMemo<AuthState>(() => {
    const uebernehmen = async (session: SessionResponse) => {
      await tokenStore.save({ accessToken: session.accessToken, refreshToken: session.refreshToken });
      client.setQueryData(['me'], session.user);
      client.invalidateQueries({ queryKey: ['favorites'] });
    };

    return {
      ready: !isPending,
      user: data ?? null,
      async login(email, password) {
        const session = await api<SessionResponse>('/auth/login', {
          method: 'POST',
          body: { email, password, device: 'LEVIZ App' },
          anonymous: true,
        });
        await uebernehmen(session);
      },
      async register(input) {
        const session = await api<SessionResponse>('/auth/register', {
          method: 'POST',
          body: { ...input, device: 'LEVIZ App' },
          anonymous: true,
        });
        await uebernehmen(session);
      },
      async logout() {
        const tokens = await tokenStore.load();
        if (tokens) {
          await api('/auth/logout', {
            method: 'POST',
            body: { refreshToken: tokens.refreshToken },
            anonymous: true,
          }).catch(() => {});
        }
        await tokenStore.clear();
        client.setQueryData(['me'], null);
        client.removeQueries({ queryKey: ['favorites'] });
      },
    };
  }, [client, data, isPending]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const state = useContext(AuthContext);
  if (!state) throw new Error('useAuth ausserhalb von AuthProvider');
  return state;
}
