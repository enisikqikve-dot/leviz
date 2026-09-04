import { getPathname } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import { siteConfig } from '@/lib/site';

/**
 * Strukturierte Daten für die Startseite.
 *
 * Zwei Angaben: wer LEVIZ ist und wie man darin sucht. Die Suchangabe erlaubt
 * es Google, direkt in den Ergebnissen ein Suchfeld für das Portal anzubieten
 * — der Pfad ist je Sprache ein anderer, deshalb wird er hier übersetzt.
 *
 * Bewusst keine erfundenen Angaben: keine Adresse, keine Telefonnummer, keine
 * Bewertungszahl. Was nicht feststeht, steht nicht drin.
 */
export function SiteJsonLd({ locale }: { locale: Locale }) {
  const searchPath = getPathname({ href: '/search', locale });

  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${siteConfig.url}/#organization`,
        name: siteConfig.name,
        url: siteConfig.url,
        logo: `${siteConfig.url}/brand/leviz-avatar-cobalt.png`,
        email: siteConfig.supportEmail,
      },
      {
        '@type': 'WebSite',
        '@id': `${siteConfig.url}/#website`,
        url: siteConfig.url,
        name: siteConfig.name,
        publisher: { '@id': `${siteConfig.url}/#organization` },
        inLanguage: locale,
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${siteConfig.url}${searchPath}?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // Der Inhalt stammt vollständig aus eigenen Konstanten, nicht aus
      // Nutzereingaben.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
