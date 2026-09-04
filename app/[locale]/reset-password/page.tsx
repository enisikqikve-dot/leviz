import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { AuthShell } from '@/features/auth/components/auth-shell';
import { ResetPasswordForm } from '@/features/auth/components/reset-password-form';
import { Button } from '@/components/ui/button';
import { Link } from '@/lib/i18n/navigation';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth' });
  return { title: t('resetTitle'), robots: { index: false } };
}

export default async function ResetPasswordPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { token } = await searchParams;
  const t = await getTranslations('auth');

  // Ohne Token laesst sich nichts zuruecksetzen, darum gar kein Formular.
  if (!token) {
    return (
      <AuthShell title={t('resetTitle')} subtitle={t('genericError')}>
        <Button asChild size="lg" className="h-11 w-full">
          <Link href="/forgot-password">{t('submitForgot')}</Link>
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={t('resetTitle')}
      subtitle={t('resetSubtitle')}
      footer={
        <Link href="/login" className="text-primary font-medium hover:underline">
          {t('backToLogin')}
        </Link>
      }
    >
      <ResetPasswordForm token={token} />
    </AuthShell>
  );
}
