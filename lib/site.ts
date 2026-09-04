export const siteConfig = {
  name: 'LEVIZ',
  /** Wird für kanonische URLs, hreflang, Sitemap und OpenGraph gebraucht. */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  supportEmail: 'kontakt@leviz.example',
} as const;
