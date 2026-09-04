import { cookies } from 'next/headers';
import { CURRENCY_COOKIE, DEFAULT_CURRENCY, isCurrency, type Currency } from './currency';

/** Liest die vom Nutzer gewählte Anzeigewährung aus dem Cookie. */
export async function getCurrency(): Promise<Currency> {
  const store = await cookies();
  const value = store.get(CURRENCY_COOKIE)?.value;
  return isCurrency(value) ? value : DEFAULT_CURRENCY;
}
