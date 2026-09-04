'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { requestPasswordResetAction } from '@/features/auth/actions';
import { Field } from '@/features/auth/components/field';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/features/auth/schemas';

export function ForgotPasswordForm() {
  const t = useTranslations('auth');
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  async function submit(values: ForgotPasswordInput) {
    const result = await requestPasswordResetAction(values);

    if (!result.ok) {
      setError('email', { message: result.fieldErrors?.email?.[0] ?? result.error });
      return;
    }

    setDone(true);
  }

  // Die Bestaetigung ist bewusst neutral formuliert. Sie verraet nicht, ob zu
  // dieser Adresse ein Konto besteht.
  if (done) {
    return (
      <div className="flex flex-col items-center py-4 text-center">
        <span className="bg-success/10 text-success inline-flex size-12 items-center justify-center rounded-full">
          <CheckCircle2 className="size-6" aria-hidden />
        </span>
        <p className="mt-4 text-sm">{t('forgotSuccess')}</p>
      </div>
    );
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

      <Button type="submit" size="lg" className="h-11 w-full" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        {t('submitForgot')}
      </Button>
    </form>
  );
}
