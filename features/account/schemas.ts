import { z } from 'zod';

import { normalizePhone } from '@/features/auth/phone';
import { passwordSchema } from '@/features/auth/schemas';
import { locales } from '@/lib/i18n/routing';

/**
 * Die Telefonnummer ist in den Einstellungen freiwillig. Ein leeres Feld heißt
 * „keine Nummer hinterlegt" und muss deshalb zu `null` werden — nicht zu einem
 * leeren Text, denn die Spalte ist eindeutig, und ein zweites Konto mit
 * demselben leeren Text ließe sich nicht speichern.
 */
const optionalPhoneSchema = z
  .string()
  .trim()
  // `nullish`, weil das Formular sein eigenes Ergebnis an den Server schickt:
  // dort ist aus dem leeren Feld schon `null` geworden. Ohne diese Zeile
  // scheitert das Speichern bei jedem, der keine Nummer hinterlegt.
  .nullish()
  .transform((value, ctx) => {
    if (!value) return null;

    const normalized = normalizePhone(value);
    if (!normalized) {
      ctx.addIssue({
        code: 'custom',
        message: 'Ungültige Telefonnummer (+383, +355 oder +389)',
      });
      return z.NEVER;
    }
    return normalized;
  });

export const profileSchema = z.object({
  name: z.string().trim().min(2, 'Name ist zu kurz').max(80, 'Name ist zu lang'),
  phone: optionalPhoneSchema,
  // Leerer Wert heißt: kein Wohnort angegeben.
  citySlug: z.string().trim().max(80).optional(),
  locale: z.enum(locales),
});

export const notificationsSchema = z.object({
  notifyByEmail: z.boolean(),
  notifyBySms: z.boolean(),
});

export const changePasswordSchema = z
  .object({
    // Das alte Passwort wird nur geprüft, nie auf Länge oder Zeichen getestet:
    // wer es vor einer Regelverschärfung gesetzt hat, muss es trotzdem
    // eingeben können, um ein neues zu vergeben.
    currentPassword: z.string().min(1, 'Bitte gib dein aktuelles Passwort ein'),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwörter stimmen nicht überein',
    path: ['confirmPassword'],
  })
  .refine((data) => data.password !== data.currentPassword, {
    message: 'Das neue Passwort muss sich vom alten unterscheiden',
    path: ['password'],
  });

/**
 * Das Formular arbeitet mit dem Eingabetyp (`phone` ist dort ein Text, auch
 * wenn er leer ist), die Aktion mit dem Ausgabetyp (`phone` ist dort `null`).
 * Ohne diese Unterscheidung passen Formularwerte und Schema nicht zusammen.
 */
export type ProfileFormInput = z.input<typeof profileSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type NotificationsInput = z.infer<typeof notificationsSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
