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

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Name ist zu kurz').max(80),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    acceptTerms: z.literal(true, {
      message: 'Bitte akzeptiere die Nutzungsbedingungen',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwörter stimmen nicht überein',
    path: ['confirmPassword'],
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

export type RegisterInput = z.infer<typeof registerSchema>;
export type CredentialsLoginInput = z.infer<typeof credentialsLoginSchema>;
export type PhoneLoginInput = z.infer<typeof phoneLoginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
