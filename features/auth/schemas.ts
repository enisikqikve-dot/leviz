import { z } from 'zod';

import { normalizePhone } from './phone';

/**
 * Mindestens acht Zeichen mit Buchstabe und Ziffer. Bewusst keine Sonderzeichen
 * erzwungen — das treibt Nutzer erfahrungsgemaess zu schwaecheren, notierten
 * Passwoertern statt zu staerkeren.
 */
export const passwordSchema = z
  .string()
  .min(8, 'Passwort muss mindestens 8 Zeichen haben')
  .max(200, 'Passwort ist zu lang')
  .regex(/[A-Za-zÀ-ž]/, 'Passwort muss mindestens einen Buchstaben enthalten')
  .regex(/\d/, 'Passwort muss mindestens eine Ziffer enthalten');

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email('Ungültige E-Mail-Adresse'));

export const phoneSchema = z
  .string()
  .trim()
  .transform((value, ctx) => {
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

export const ACCOUNT_TYPES = ['PRIVATE', 'DEALER'] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const registerSchema = z
  .object({
    /**
     * Privatverkäufer oder Autohaus. Die Wahl fällt bei der Registrierung und
     * nicht später: ein Händler, der erst ein Privatkonto anlegt und dann
     * umsteigen muss, legt in der Praxis ein zweites Konto an.
     */
    accountType: z.enum(ACCOUNT_TYPES).default('PRIVATE'),

    name: z.string().trim().min(2, 'Name ist zu kurz').max(80),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    acceptTerms: z.literal(true, {
      message: 'Bitte akzeptiere die Nutzungsbedingungen',
    }),

    /** Nur beim Autohaus. Leere Felder werden zu `null`. */
    companyName: z
      .string()
      .trim()
      .max(160)
      .nullish()
      .transform((value) => value || null),
    registrationNumber: z
      .string()
      .trim()
      .max(40)
      .nullish()
      .transform((value) => value || null),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwörter stimmen nicht überein',
    path: ['confirmPassword'],
  })
  .superRefine((data, ctx) => {
    if (data.accountType !== 'DEALER') return;

    // Ohne diese beiden Angaben ist es kein Händlerkonto, sondern ein
    // Privatkonto mit einem Abzeichen davor.
    if (!data.companyName) {
      ctx.addIssue({ code: 'custom', path: ['companyName'], message: 'errorCompanyName' });
    }
    if (!data.registrationNumber) {
      ctx.addIssue({
        code: 'custom',
        path: ['registrationNumber'],
        message: 'errorRegistrationNumber',
      });
    }
  });

export const credentialsLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Passwort fehlt'),
});

export const phoneCodeRequestSchema = z.object({
  phone: phoneSchema,
});

export const phoneLoginSchema = z.object({
  phone: phoneSchema,
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Der Code besteht aus sechs Ziffern'),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwörter stimmen nicht überein',
    path: ['confirmPassword'],
  });

/** Was das Formular haelt -- vor der Umwandlung leerer Felder zu `null`. */
export type RegisterFormInput = z.input<typeof registerSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CredentialsLoginInput = z.infer<typeof credentialsLoginSchema>;
export type PhoneLoginInput = z.infer<typeof phoneLoginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
