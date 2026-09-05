import { z } from 'zod';

/**
 * Die Art der Meldung. Bewusst wenige Möglichkeiten: eine lange Liste lässt
 * Melder raten, welche Schublade gemeint ist, und die Antwort hilft niemandem.
 */
export const BUG_KINDS = ['BUG', 'DISPLAY', 'CONTENT', 'IDEA', 'OTHER'] as const;
export type BugKind = (typeof BUG_KINDS)[number];

export const BUG_STATUSES = ['OPEN', 'REVIEWING', 'RESOLVED', 'DISMISSED'] as const;
export type BugStatus = (typeof BUG_STATUSES)[number];

/**
 * Genug Text, um etwas nachstellen zu können — und nicht mehr als nötig.
 * Zwanzig Zeichen schliessen „geht nicht" aus, ohne einen knappen, aber
 * echten Satz zu verhindern.
 */
export const MESSAGE_MIN = 20;
export const MESSAGE_MAX = 2000;

export const bugReportSchema = z.object({
  kind: z.enum(BUG_KINDS),

  message: z
    .string()
    .trim()
    .min(MESSAGE_MIN, 'Bitte beschreibe kurz, was passiert ist')
    .max(MESSAGE_MAX, 'Die Beschreibung ist zu lang'),

  /**
   * Freiwillig. Ohne Adresse können wir nicht zurückfragen — und bei einem
   * Fehlerbericht ist die Rückfrage meistens der entscheidende Schritt.
   */
  email: z
    .string()
    .trim()
    .max(200)
    // `nullish` statt `optional`: das Formular pruefte bereits im Browser und
    // schickt das *Ergebnis* an den Server, wo dasselbe Schema erneut greift.
    // Aus dem leeren Feld ist dann `null` geworden — ohne diese Zeile faellt
    // das Schema ueber seine eigene Ausgabe.
    .nullish()
    .transform((value, ctx) => {
      if (!value) return null;

      const parsed = z.email().safeParse(value.toLowerCase());
      if (!parsed.success) {
        ctx.addIssue({ code: 'custom', message: 'Ungültige E-Mail-Adresse' });
        return z.NEVER;
      }
      return parsed.data;
    }),

  /**
   * Die Seite, auf der es passiert ist. Kommt aus dem Browser und ist damit
   * nur ein Hinweis, kein Beweis — aber der wichtigste, um es nachzustellen.
   */
  pageUrl: z.string().trim().max(500).optional(),
});

export const bugStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(BUG_STATUSES),
  note: z.string().trim().max(1000).optional(),
});

export type BugReportFormInput = z.input<typeof bugReportSchema>;
export type BugReportInput = z.infer<typeof bugReportSchema>;
export type BugStatusInput = z.infer<typeof bugStatusSchema>;
