import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { AuthShell } from '@/features/auth/components/auth-shell';
import { RegisterForm } from '@/features/auth/components/register-form';
import { SocialSignIn } from '@/features/auth/components/social-sign-in';
import { getSessionUser } from '@/lib/auth/guards';
import { configuredSocialProviders } from '@/lib/auth/social';
import { Link } from '@/lib/i18n/navigation';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth' });
  return { title: t('registerTitle'), robots: { index: false } };
}

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  if (await getSessionUser()) redirect(`/${locale}/dashboard`);

  const t = await getTranslations('auth');

  return (
    <AuthShell
      title={t('registerTitle')}
      subtitle={t('registerSubtitle')}
      footer={
        <>
          {t('hasAccount')}{' '}
          <Link href="/login" className="text-primary font-medium hover:underline">
            {t('submitLogin')}
          </Link>
        </>
      }
    >
      {/* Ueber dem Formular: mit Google oder Apple ist das Konto ein Klick,
          das Formular bleibt fuer alle anderen -- und fuer Autohaeuser, die
          Firmenname und Registernummer angeben. */}
      <SocialSignIn providers={configuredSocialProviders()} mode="register" />
      <RegisterForm />
    </AuthShell>
  );
}
