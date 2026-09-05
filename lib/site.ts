import { legalEntity } from '@/lib/legal';

export const siteConfig = {
  name: 'LEVIZ',
  /** Wird für kanonische URLs, hreflang, Sitemap und OpenGraph gebraucht. */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  /**
   * Kommt aus dem Impressum, damit nicht zwei Adressen nebeneinander stehen
   * und auseinanderlaufen. Leer, solange dort nichts eingetragen ist — eine
   * erfundene Adresse in den strukturierten Daten wäre schlechter als keine.
   */
  supportEmail: legalEntity.email,
} as const;
