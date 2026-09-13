import { updateProfile } from '@/features/account/core';
import { loadSettings } from '@/features/account/data';
import { requireApiUser } from '@/lib/api/auth';
import { handle, ok, readJson, unwrap } from '@/lib/api/respond';

/**
 * GET /api/v1/me/profile -> die Einstellungen, wie sie die Website zeigt:
 * Name, E-Mail, Telefon, Sprache, Wohnort -- und die Staedte zur Auswahl.
 */
export const GET = handle(async (request) => {
  const user = await requireApiUser(request);
  const settings = await loadSettings(user.id);

  return ok({
    name: settings.name,
    email: settings.email,
    phone: settings.phone,
    locale: settings.locale,
    citySlug: settings.citySlug,
    hasPassword: settings.hasPassword,
    cities: settings.cities,
  });
});

/**
 * PATCH /api/v1/me/profile { name, phone, citySlug, locale } -> speichern.
 *
 * Dasselbe Schema und dieselbe Funktion wie das Formular auf der Website.
 * Feldfehler kommen als Uebersetzungsschluessel aus dem Namensraum `account`
 * (etwa `errorPhoneTaken`), die App uebersetzt sie selbst.
 */
export const PATCH = handle(async (request) => {
  const user = await requireApiUser(request);

  unwrap(await updateProfile(user.id, await readJson(request)));

  const settings = await loadSettings(user.id);
  return ok({
    name: settings.name,
    email: settings.email,
    phone: settings.phone,
    locale: settings.locale,
    citySlug: settings.citySlug,
    hasPassword: settings.hasPassword,
    cities: settings.cities,
  });
});
