import { z } from 'zod';

import { MAX_GENERATED_CODES, VOUCHER_KINDS } from './discount';

/** Leeres Feld heisst „nicht angegeben" und wird zu `null`. */
const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => value || null);

/**
 * Eine Zahl, die auch leer bleiben darf.
 *
 * Ein leeres Zahlenfeld liefert im Browser `''`, und `coerce` macht daraus
 * eine 0 — die dann an der Untergrenze scheitert. Weil das Feld je nach Art
 * des Gutscheins gar nicht sichtbar ist, bliebe das Formular ohne diese
 * Umwandlung stumm stehen: der Fehler haenge an einem Feld, das niemand sieht.
 */
const optionalZahl = <T extends z.ZodType>(feld: T) =>
  z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? null : value),
    feld.nullable(),
  );

export const createVoucherSchema = z
  .object({
    kind: z.enum(VOUCHER_KINDS),

    /**
     * Ein Prozentwert von 100 macht das Paket kostenlos. Das ist gewollt und
     * deshalb keine Ausnahme, sondern die Obergrenze.
     */
    percentOff: optionalZahl(z.coerce.number().int().min(1).max(100)),
    amountOffEuro: optionalZahl(z.coerce.number().min(0.01).max(10_000)),

    /** Leer heisst: gilt für jedes Paket. */
    packageId: optional(40),

    /** Wie oft ein einzelner Code eingelöst werden darf. */
    maxRedemptions: z.coerce.number().int().min(1).max(10_000).default(1),

    /** Wie viele Codes auf einmal erzeugt werden. */
    count: z.coerce.number().int().min(1).max(MAX_GENERATED_CODES).default(1),

    /** Kurz halten: der Code wird abgetippt und durchgegeben. */
    prefix: z
      .string()
      .trim()
      .max(12, 'errorPrefix')
      .nullish()
      .transform((value) => value || null),
    label: optional(120),

    /** Leer heisst: läuft nicht ab. */
    validUntil: optional(30),
  })
  .superRefine((value, ctx) => {
    if (value.kind === 'PERCENT' && !value.percentOff) {
      ctx.addIssue({ code: 'custom', path: ['percentOff'], message: 'errorPercent' });
    }
    if (value.kind === 'AMOUNT' && !value.amountOffEuro) {
      ctx.addIssue({ code: 'custom', path: ['amountOffEuro'], message: 'errorAmount' });
    }
    if (value.validUntil && Number.isNaN(Date.parse(value.validUntil))) {
      ctx.addIssue({ code: 'custom', path: ['validUntil'], message: 'errorDate' });
    }
  });

export const previewVoucherSchema = z.object({
  code: z.string().trim().min(1, 'errorCodeMissing').max(60),
  packageId: z.string().min(1),
});

export type CreateVoucherFormInput = z.input<typeof createVoucherSchema>;
export type CreateVoucherInput = z.infer<typeof createVoucherSchema>;
export type PreviewVoucherInput = z.infer<typeof previewVoucherSchema>;
