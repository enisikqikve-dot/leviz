import type { MetadataRoute } from 'next';

import { siteConfig } from '@/lib/site';

/**
 * Was Suchmaschinen sehen dürfen.
 *
 * Gesperrt ist alles, was hinter der Anmeldung liegt oder keinen Wert im Index
 * hat: das Konto, der Verwaltungsbereich, die Bezahlseiten und die API. Die
 * Fahrzeugseiten selbst sind der Grund, warum es das Portal gibt — die bleiben
 * offen.
 *
 * Gefilterte Ergebnislisten sind zusätzlich in ihrer eigenen `robots`-Angabe
 * auf `noindex, follow` gesetzt: die Links darin sollen verfolgt werden, die
 * Liste selbst gehört nicht in den Index.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin',
          // Die drei Sprachfassungen der geschützten Bereiche.
          '/paneli/', '/konto/', '/dashboard/',
          '/pagesa/', '/bezahlen/', '/checkout/',
          '/hyr', '/anmelden', '/login',
          '/regjistrohu', '/registrieren', '/register',
          '/harrova-fjalekalimin', '/passwort-vergessen', '/forgot-password',
          '/rivendos-fjalekalimin', '/passwort-zuruecksetzen', '/reset-password',
        ],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
