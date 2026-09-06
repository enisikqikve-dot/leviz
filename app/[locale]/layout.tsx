import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Toaster } from 'sonner';

import { ReportBugButton } from '@/components/leviz/report-bug-button';
import { SiteFooter } from '@/components/leviz/site-footer';
import { SiteHeader } from '@/components/leviz/site-header';
import { ThemeProvider } from '@/components/leviz/theme-provider';
import { getCurrency } from '@/lib/currency-server';
import { routing } from '@/lib/i18n/routing';
import { siteConfig } from '@/lib/site';

import '../globals.css';

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-inter',
  display: 'swap',
});

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'home.meta' });
  const brand = await getTranslations({ locale, namespace: 'brand' });

  return {
    metadataBase: new URL(siteConfig.url),
    title: {
      default: t('title'),
      template: `%s – ${siteConfig.name}`,
    },
    description: t('description'),
    applicationName: siteConfig.name,
    openGraph: {
      type: 'website',
      siteName: siteConfig.name,
      title: t('title'),
      description: t('description'),
      locale,
    },
    twitter: {
      card: 'summary_large_image',
      title: t('title'),
      description: t('description'),
    },
    other: { 'brand:tagline': brand('tagline') },
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Ermöglicht statisches Rendern innerhalb dieses Sprachzweigs.
  setRequestLocale(locale);

  const currency = await getCurrency();
  const t = await getTranslations({ locale, namespace: 'common' });

  return (
    <html lang={locale} suppressHydrationWarning className={inter.variable}>
      <body className="font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NextIntlClientProvider>
            <a
              href="#main"
              className="bg-primary text-primary-foreground sr-only rounded-md px-4 py-2 focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50"
            >
              {t('skipToContent')}
            </a>
            <div className="flex min-h-dvh flex-col">
              <SiteHeader currency={currency} />
              <main id="main" className="flex-1">
                {children}
              </main>
              <SiteFooter />
            </div>
            <ReportBugButton />
            <Toaster position="top-center" richColors closeButton />
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
