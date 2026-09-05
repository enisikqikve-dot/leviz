import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { AuthShell } from '@/features/auth/components/auth-shell';
import { LoginForm } from '@/features/auth/components/login-form';
import { authErrorKey } from '@/features/auth/oauth-error';
import { getSessionUser } from '@/lib/auth/guards';
import { Link } from '@/lib/i18n/navigation';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth' });
  return { title: t('loginTitle'), robots: { index: false } };
}

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Angemeldete Nutzer haben auf der Anmeldeseite nichts zu suchen.
  if (await getSessionUser()) redirect(`/${locale}/dashboard`);

  const t = await getTranslations('auth');
  const githubEnabled =
    Boolean(process.env.AUTH_GITHUB_ID) && Boolean(process.env.AUTH_GITHUB_SECRET);

  // Auth.js leitet gescheiterte OAuth-Anmeldungen hierher zurueck und haengt
  // den Grund als Parameter an. Ohne diese Zeilen bliebe er unsichtbar.
  const errorKey = authErrorKey((await searchParams).error);

  return (
    <AuthShell
      title={t('loginTitle')}
      subtitle={t('loginSubtitle')}
      footer={
        <>
          {t('noAccount')}{' '}
          <Link href="/register" className="text-primary font-medium hover:underline">
            {t('submitRegister')}
          </Link>
        </>
      }
    >
      {errorKey ? (
        <p
          role="alert"
          className="border-destructive/40 bg-destructive/10 text-destructive mb-6 rounded-lg border px-4 py-3 text-sm"
        >
          {t(errorKey)}
        </p>
      ) : null}

      <LoginForm githubEnabled={githubEnabled} />
    </AuthShell>
  );
}
