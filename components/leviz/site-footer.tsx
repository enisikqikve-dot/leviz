import { getTranslations } from 'next-intl/server';

import { LevizLogo } from '@/components/leviz/logo';
import { Link } from '@/lib/i18n/navigation';
import { siteConfig } from '@/lib/site';

const COLUMNS = [
  {
    heading: 'marketplace',
    links: [
      { href: '/search', key: 'nav.search' },
      { href: '/sell/create', key: 'nav.sell' },
      { href: '/dealers', key: 'nav.dealers' },
      { href: '/pricing', key: 'nav.pricing' },
    ],
  },
  {
    heading: 'company',
    links: [{ href: '/contact', key: 'footer.contact' }],
  },
  {
    heading: 'legal',
    links: [
      { href: '/terms', key: 'footer.terms' },
      { href: '/withdrawal', key: 'footer.withdrawal' },
      { href: '/privacy', key: 'footer.privacy' },
      { href: '/cookies', key: 'footer.cookies' },
      { href: '/imprint', key: 'footer.imprint' },
    ],
  },
] as const;

/*
 * Hier standen einmal /about, /careers, /press, /help, /safety und /report.
 * Keine dieser Seiten existiert; alle sechs antworteten mit 404. Ein toter
 * Verweis in der Fusszeile jeder Seite ist schlechter als gar keiner —
 * besonders gegenueber einem Zahlungsdienstleister, der die Seite vor der
 * Freischaltung durchklickt. Sie kommen zurueck, sobald es sie gibt.
 */

export async function SiteFooter() {
  const t = await getTranslations();
  const year = new Date().getFullYear();

  return (
    <footer className="bg-ink text-ink-foreground mt-24">
      <div className="lv-container py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <LevizLogo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/60">
              {t('footer.tagline')}
            </p>
            <p className="text-primary mt-4 text-sm font-medium">
              {t('brand.tagline')}
            </p>
          </div>

          {COLUMNS.map((column) => (
            <nav key={column.heading} aria-label={t(`footer.${column.heading}`)}>
              <h2 className="text-xs font-semibold tracking-wider text-white/50 uppercase">
                {t(`footer.${column.heading}`)}
              </h2>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      // Informationsseiten entstehen in Phase 11 und sind bewusst
                      // nicht Teil des übersetzten Routings.
                      href={link.href as '/search'}
                      className="text-sm text-white/70 transition-colors hover:text-white"
                    >
                      {t(link.key)}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-sm text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {siteConfig.name}. {t('footer.rights')}
          </p>
          <p>{t('brand.description')}</p>
        </div>
      </div>
    </footer>
  );
}
