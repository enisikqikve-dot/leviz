import { z } from 'zod';

import { normalizePhone } from '@/features/auth/phone';

/**
 * Kaufanfrage an den Verkäufer. Entweder E-Mail oder Telefon muss vorhanden
 * sein — ohne Rückkanal ist die Anfrage wertlos.
 */
export const inquirySchema = z
  .object({
    vehicleId: z.string().min(1),
    name: z.string().trim().min(2, 'Emri është shumë i shkurtër').max(80),
    email: z.string().trim().toLowerCase().pipe(z.email()).optional().or(z.literal('')),
    phone: z.string().trim().optional().or(z.literal('')),
    message: z.string().trim().min(10, 'Mesazhi është shumë i shkurtër').max(2000),
  })
  .transform((data) => ({
    ...data,
    email: data.email === '' ? undefined : data.email,
    phone: data.phone ? (normalizePhone(data.phone) ?? undefined) : undefined,
  }))
  .refine((data) => Boolean(data.email ?? data.phone), {
    message: 'Shto email ose numër telefoni',
    path: ['email'],
  });

export type InquiryInput = z.input<typeof inquirySchema>;
