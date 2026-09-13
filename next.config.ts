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
    // Nur WebP. AVIF ist das teuerste Format, das es gibt: ein 12-Megapixel-
    // Handyfoto belegt beim Kodieren Hunderte MB und Sekunden auf dem einen
    // Kern des Servers, und eine Fahrzeugseite loest davon dreissig
    // gleichzeitig aus. Am 13.09.2026 hat genau das den Server mit 4 GB
    // eingefroren. WebP kostet einen Bruchteil und ist bei Fotos praktisch
    // gleich klein.
    formats: ['image/webp'],
    // Weniger Breiten, weniger Umrechnungen je Foto. 4K braucht hier niemand.
    deviceSizes: [640, 828, 1080, 1280, 1920],
    // Fertig gerechnete Bilder bleiben 31 Tage im Cache. Die Fotos der
    // Verkaeufer aendern sich unter ihrer Adresse ohnehin nie (immutable),
    // die Vorgabe von vier Stunden gilt nur fuer die Seed-Bilder von aussen.
    minimumCacheTTL: 2678400,
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
        /*
         * Die App-API darf von ueberall gerufen werden.
         *
         * Eine App auf dem Telefon kennt keine Herkunftspruefung; die
         * Freigabe gilt der Web-Fassung von Expo und jedem, der die API mit
         * einem Token aus einer anderen Herkunft benutzt. Unbedenklich, weil
         * hier nichts an Cookies haengt: ohne Bearer-Token gibt die API nur
         * her, was ohnehin oeffentlich ist.
         *
         * Bilder unter /uploads bleiben davon unberuehrt -- die App laedt sie
         * als <img>, nicht per fetch.
         */
        source: '/api/v1/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, PATCH, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Authorization, Content-Type' },
          { key: 'Access-Control-Max-Age', value: '86400' },
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
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
          // Die App zeigt die Fotos von einer anderen Herkunft aus an -- auf
          // dem Telefon ohnehin, in der Web-Fassung von Expo ueber den
          // Browser. Die Sperre oben gilt fuer alles andere weiter.
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
