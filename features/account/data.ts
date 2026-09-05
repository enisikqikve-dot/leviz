import { prisma } from '@/lib/db';
import type { Locale } from '@/lib/i18n/routing';

export type SettingsCity = {
  slug: string;
  name: string;
  countryCode: string;
};

export type SettingsData = {
  name: string;
  email: string | null;
  phone: string | null;
  locale: Locale;
  citySlug: string | null;
  notifyByEmail: boolean;
  notifyBySms: boolean;
  /** Konten aus GitHub oder Telefonanmeldung haben kein Passwort. */
  hasPassword: boolean;
  cities: SettingsCity[];
};

/** Alles, was die Einstellungsseite in einem Zug braucht. */
export async function loadSettings(userId: string): Promise<SettingsData> {
  const [user, cities] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        phone: true,
        locale: true,
        passwordHash: true,
        profile: {
          select: {
            notifyByEmail: true,
            notifyBySms: true,
            city: { select: { slug: true } },
          },
        },
      },
    }),
    prisma.city.findMany({
      where: { country: { isCoreMarket: true } },
      select: { slug: true, name: true, country: { select: { code: true } } },
      orderBy: [{ country: { sortOrder: 'asc' } }, { population: 'desc' }],
    }),
  ]);

  return {
    name: user.name ?? '',
    email: user.email,
    phone: user.phone,
    locale: user.locale as Locale,
    citySlug: user.profile?.city?.slug ?? null,
    // Fehlt das Profil noch, gelten die Vorgaben aus dem Datenmodell.
    notifyByEmail: user.profile?.notifyByEmail ?? true,
    notifyBySms: user.profile?.notifyBySms ?? false,
    hasPassword: Boolean(user.passwordHash),
    cities: cities.map((city) => ({
      slug: city.slug,
      name: city.name,
      countryCode: city.country.code,
    })),
  };
}
