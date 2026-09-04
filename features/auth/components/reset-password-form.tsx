'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { resetPasswordAction } from '@/features/auth/actions';
import { Field } from '@/features/auth/components/field';
import { resetPasswordSchema, type ResetPasswordInput } from '@/features/auth/schemas';
import { useRouter } from '@/lib/i18n/navigation';

export function ResetPasswordForm({ token }: { token: string }) {
  const t = useTranslations('auth');
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token, password: '', confirmPassword: '' },
  });

  async function submit(values: ResetPasswordInput) {
    const result = await resetPasswordAction(values);

    if (!result.ok) {
      const fieldError = result.fieldErrors?.password?.[0];
      if (fieldError) setError('password', { message: fieldError });
      else toast.error(result.error);
      return;
    }

    toast.success(t('resetSuccess'));
    router.push('/login');
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
      <input type="hidden" {...register('token')} />

      <Field id="password" label={t('password')} error={errors.password?.message}>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          className="h-11"
          {...register('password')}
        />
      </Field>

      <Field
        id="confirmPassword"
        label={t('confirmPassword')}
        error={errors.confirmPassword?.message}
      >
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          className="h-11"
          {...register('confirmPassword')}
        />
      </Field>

      <Button type="submit" size="lg" className="h-11 w-full" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        {t('submitReset')}
      </Button>
    </form>
  );
}
