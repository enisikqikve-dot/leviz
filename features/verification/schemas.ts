import { z } from 'zod';

export const VERIFICATION_KINDS = ['PERSON', 'DEALER'] as const;
export type VerificationKind = (typeof VERIFICATION_KINDS)[number];

export const DOCUMENT_TYPES = [
  'ID_FRONT',
  'ID_BACK',
  'BUSINESS_REGISTRATION',
  'ADDRESS_PROOF',
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

/**
 * Welche Belege welcher Antrag braucht.
 *
 * Für eine Person reicht der Ausweis von beiden Seiten — die Rückseite trägt
 * in der Region die Adresse. Ein Händler weist zusätzlich die Firma nach:
 * den Registerauszug mit der Betriebsnummer und einen Beleg über die
 * Geschäftsadresse, damit ein Konto nicht auf eine erfundene Adresse läuft.
 */
export const REQUIRED_DOCUMENTS: Record<VerificationKind, readonly DocumentType[]> = {
  PERSON: ['ID_FRONT', 'ID_BACK'],
  DEALER: ['ID_FRONT', 'ID_BACK', 'BUSINESS_REGISTRATION', 'ADDRESS_PROOF'],
};

/**
 * Wie lange die Belege nach der Entscheidung liegen bleiben.
 *
 * Lange genug für einen Streitfall, kurz genug, dass hier keine Sammlung von
 * Ausweiskopien entsteht. Die Entscheidung selbst — wer, wann, mit welchem
 * Ergebnis — bleibt dauerhaft.
 */
export const DOCUMENT_RETENTION_DAYS = 90;

/** Leerer Text bedeutet „nicht angegeben" und wird zu `null`. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    // `nullish` statt `optional`: das Formular prueft schon im Browser und
    // schickt sein *Ergebnis* an den Server, wo dasselbe Schema erneut greift.
    // Aus dem leeren Feld ist dann `null` geworden.
    .nullish()
    .transform((value) => value || null);

export const verificationSchema = z
  .object({
    kind: z.enum(VERIFICATION_KINDS),

    /**
     * Der Name genau wie im Ausweis. Weicht er vom Kontonamen ab, ist das der
     * erste Punkt, den der Prüfer anschaut — deshalb wird er eigens gefragt
     * und nicht aus dem Konto übernommen.
     */
    legalName: z.string().trim().min(3, 'errorLegalName').max(120, 'errorLegalName'),

    addressLine: z.string().trim().min(4, 'errorAddress').max(160, 'errorAddress'),
    postalCode: optionalText(12),
    city: z.string().trim().min(2, 'errorCity').max(80, 'errorCity'),

    companyName: optionalText(160),
    registrationNumber: optionalText(40),
  })
  .superRefine((value, ctx) => {
    if (value.kind !== 'DEALER') return;

    if (!value.companyName) {
      ctx.addIssue({ code: 'custom', path: ['companyName'], message: 'errorCompanyName' });
    }
    if (!value.registrationNumber) {
      ctx.addIssue({
        code: 'custom',
        path: ['registrationNumber'],
        message: 'errorRegistrationNumber',
      });
    }
  });

export const reviewSchema = z
  .object({
    id: z.string().min(1),
    decision: z.enum(['VERIFIED', 'REJECTED']),
    note: optionalText(1000),
  })
  .superRefine((value, ctx) => {
    // Eine Ablehnung ohne Begründung ist für den Antragsteller wertlos: er
    // weiss dann nicht, was er nachbessern soll, und lädt dasselbe wieder hoch.
    if (value.decision === 'REJECTED' && !value.note) {
      ctx.addIssue({ code: 'custom', path: ['note'], message: 'errorReasonRequired' });
    }
  });

export type VerificationFormInput = z.input<typeof verificationSchema>;
export type VerificationInput = z.infer<typeof verificationSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
