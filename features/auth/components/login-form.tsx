'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { requestPhoneCodeAction } from '@/features/auth/actions';
import { Field } from '@/features/auth/components/field';
import {
  credentialsLoginSchema,
  phoneLoginSchema,
  type CredentialsLoginInput,
  type PhoneLoginInput,
} from '@/features/auth/schemas';
import { Link, useRouter } from '@/lib/i18n/navigation';

export function LoginForm({ githubEnabled }: { githubEnabled: boolean }) {
  const t = useTranslations('auth');
  const router = useRouter();

  return (
    <Tabs defaultValue="password">
      <TabsList className="mb-6 grid w-full grid-cols-2">
        <TabsTrigger value="password">{t('tabPassword')}</TabsTrigger>
        <TabsTrigger value="phone">{t('tabPhone')}</TabsTrigger>
      </TabsList>

      <TabsContent value="password">
        <PasswordForm onDone={() => router.push('/dashboard')} />
      </TabsContent>

      <TabsContent value="phone">
        <PhoneForm onDone={() => router.push('/dashboard')} />
      </TabsContent>

      {githubEnabled ? (
        <div className="mt-6">
          <div className="relative text-center">
            <span className="bg-card text-muted-foreground relative z-10 px-3 text-xs">
              {t('orContinue')}
            </span>
            <span className="bg-border absolute inset-x-0 top-1/2 h-px" aria-hidden />
          </div>
          <Button
            type="button"
            variant="outline"
            className="mt-4 w-full"
            onClick={() => signIn('github', { redirectTo: '/dashboard' })}
          >
            {t('github')}
          </Button>
        </div>
      ) : null}
    </Tabs>
  );
}

function PasswordForm({ onDone }: { onDone: () => void }) {
  const t = useTranslations('auth');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CredentialsLoginInput>({
    resolver: zodResolver(credentialsLoginSchema),
    defaultValues: { email: '', password: '' },
  });

  async function submit(values: CredentialsLoginInput) {
    const result = await signIn('password', { ...values, redirect: false });

    if (!result || result.error) {
      toast.error(t('invalidCredentials'));
      return;
    }

    onDone();
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
      <Field id="email" label={t('email')} error={errors.email?.message}>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          className="h-11"
          {...register('email')}
        />
      </Field>

      <Field id="password" label={t('password')} error={errors.password?.message}>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          className="h-11"
          {...register('password')}
        />
      </Field>

      <div className="flex justify-end">
        <Link
          href="/forgot-password"
          className="text-muted-foreground hover:text-foreground text-sm transition-colors"
        >
          {t('forgotLink')}
        </Link>
      </div>

      <Button type="submit" size="lg" className="h-11 w-full" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        {t('submitLogin')}
      </Button>
    </form>
  );
}

function PhoneForm({ onDone }: { onDone: () => void }) {
  const t = useTranslations('auth');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PhoneLoginInput>({
    resolver: zodResolver(phoneLoginSchema),
    defaultValues: { phone: '', code: '' },
    // Der Code wird erst nach dem Versand erwartet.
    mode: 'onSubmit',
  });

  async function requestCode() {
    setSending(true);
    const result = await requestPhoneCodeAction({ phone: getValues('phone') });
    setSending(false);

    if (!result.ok) {
      setError('phone', { message: result.fieldErrors?.phone?.[0] ?? result.error });
      return;
    }

    setSent(true);
    toast.success(t('codeSent'), { description: t('codeHint') });
  }

  async function submit(values: PhoneLoginInput) {
    const result = await signIn('phone', { ...values, redirect: false });

    if (!result || result.error) {
      setError('code', { message: t('invalidCredentials') });
      return;
    }

    onDone();
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
      <Field
        id="phone"
        label={t('phone')}
        error={errors.phone?.message}
        hint="+383 44 123 456"
      >
        <Input
          id="phone"
          type="tel"
          autoComplete="tel"
          placeholder="044 123 456"
          className="h-11"
          readOnly={sent}
          {...register('phone')}
        />
      </Field>

      {sent ? (
        <Field id="code" label={t('code')} error={errors.code?.message}>
          <Input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="123456"
            className="h-11 tracking-[0.4em]"
            {...register('code')}
          />
        </Field>
      ) : null}

      {sent ? (
        <Button type="submit" size="lg" className="h-11 w-full" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {t('verifyCode')}
        </Button>
      ) : (
        <Button
          type="button"
          size="lg"
          className="h-11 w-full"
          onClick={requestCode}
          disabled={sending}
        >
          {sending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {t('sendCode')}
        </Button>
      )}
    </form>
  );
}
