import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./lib/i18n/request.ts');

const nextConfig: NextConfig = {
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
};

export default withNextIntl(nextConfig);
