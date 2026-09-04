'use server';

import { cookies } from 'next/headers';

import { CURRENCIES, CURRENCY_COOKIE, type Currency } from '@/lib/currency';

const ONE_YEAR = 60 * 60 * 24 * 365;

/**
 * Die Anzeigewährung wird serverseitig gesetzt, weil Preise auch serverseitig
 * formatiert werden. So bleibt das Cookie die einzige Wahrheit und die
 * Komponente muss nichts am Dokument verändern.
 */
export async function setCurrencyAction(currency: Currency): Promise<void> {
  if (!CURRENCIES.includes(currency)) return;

  const store = await cookies();
  store.set(CURRENCY_COOKIE, currency, {
    path: '/',
    maxAge: ONE_YEAR,
    sameSite: 'lax',
  });
}
