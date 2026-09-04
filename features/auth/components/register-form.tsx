'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { registerAction } from '@/features/auth/actions';
import { Field } from '@/features/auth/components/field';
import { registerSchema, type RegisterInput } from '@/features/auth/schemas';
import { useRouter } from '@/lib/i18n/navigation';

export function RegisterForm() {
  const t = useTranslations('auth');
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setError,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false as unknown as true,
    },
  });

  async function submit(values: RegisterInput) {
    const result = await registerAction(values);

    if (!result.ok) {
      for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
        setError(field as keyof RegisterInput, { message: messages[0] });
      }
      if (!result.fieldErrors) toast.error(result.error);
      return;
    }

    toast.success(t('registerSuccess'));

    // Nach erfolgreicher Registrierung direkt anmelden, damit die Zugangsdaten
    // nicht ein zweites Mal eingegeben werden muessen.
    const signedIn = await signIn('password', {
      email: getValues('email'),
      password: getValues('password'),
      redirect: false,
    });

    router.push(signedIn && !signedIn.error ? '/dashboard' : '/login');
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
      <Field id="name" label={t('name')} error={errors.name?.message}>
        <Input id="name" autoComplete="name" className="h-11" {...register('name')} />
      </Field>

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

      <div className="space-y-1.5">
        <label className="flex cursor-pointer items-start gap-2.5 text-sm">
          <input
            type="checkbox"
            className="accent-primary mt-0.5 size-4 shrink-0"
            {...register('acceptTerms')}
          />
          <span className="text-muted-foreground leading-snug">{t('acceptTerms')}</span>
        </label>
        {errors.acceptTerms?.message ? (
          <p role="alert" className="text-destructive text-xs">
            {errors.acceptTerms.message}
          </p>
        ) : null}
      </div>

      <Button type="submit" size="lg" className="h-11 w-full" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        {t('submitRegister')}
      </Button>
    </form>
  );
}
