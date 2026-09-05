import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./lib/i18n/request.ts');

const nextConfig: NextConfig = {
  /**
   * Legt neben dem Build einen eigenständigen Server samt der tatsächlich
   * benötigten Abhängigkeiten ab. Ohne das müsste das Docker-Abbild den
   * gesamten node_modules-Ordner mitschleppen — mehrere hundert Megabyte,
   * von denen im Betrieb ein Bruchteil gebraucht wird.
   */
  output: 'standalone',

  images: {
    // Seed-Inserate nutzen frei lizenzierte Fahrzeugfotos.
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'images.pexels.com' },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    // forbidden() liefert eine echte 403-Antwort statt einer Notloesung.
    authInterrupts: true,
    // Server Actions verarbeiten Bild-Uploads im Inserat-Assistenten.
    serverActions: { bodySizeLimit: '12mb' },
  },

  // Die Kopfzeile mit der Technik verraet Angreifern die Version.
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Verhindert, dass ein Fremder LEVIZ in einen Rahmen setzt und
          // Klicks abfaengt — auf einer Seite mit Kaufabsichten ein reales
          // Risiko.
          { key: 'X-Frame-Options', value: 'DENY' },

          // Kein Erraten des Inhaltstyps: ein hochgeladenes Bild darf nie als
          // Skript ausgefuehrt werden, auch wenn jemand die Endung faelscht.
          { key: 'X-Content-Type-Options', value: 'nosniff' },

          // Beim Wechsel auf eine fremde Seite geht nur die Herkunft mit,
          // nicht der volle Pfad. Sonst erfuehre der Zielserver, welches
          // Fahrzeug jemand angesehen hat.
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },

          // LEVIZ braucht weder Kamera noch Mikrofon noch Bezahl-Schnittstelle
          // im Browser. Was nicht gebraucht wird, bleibt aus.
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), payment=(), usb=(), interest-cohort=()',
          },

          // Ein Jahr HTTPS erzwingen. Wirkt nur ueber HTTPS, im lokalen
          // Betrieb also folgenlos.
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },

          // Fremde Seiten duerfen keine Ressourcen von hier einbinden.
          { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
        ],
      },
      {
        // Hochgeladene Bilder liegen unter derselben Herkunft wie die
        // Anwendung. Ohne diese Sperre koennte eine als Bild getarnte
        // HTML-Datei Skripte im Namen von LEVIZ ausfuehren.
        source: '/uploads/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
          },
          { key: 'Content-Disposition', value: 'inline' },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
