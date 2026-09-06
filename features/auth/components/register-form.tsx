'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, Loader2, User } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { registerAction } from '@/features/auth/actions';
import { Field } from '@/features/auth/components/field';
import {
  registerSchema,
  type AccountType,
  type RegisterFormInput,
  type RegisterInput,
} from '@/features/auth/schemas';
import { useRouter } from '@/lib/i18n/navigation';
import { cn } from '@/lib/utils';

export function RegisterForm() {
  const t = useTranslations('auth');
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    getValues,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormInput, unknown, RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      accountType: 'PRIVATE',
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false as unknown as true,
      companyName: '',
      registrationNumber: '',
    },
  });

  // useWatch statt form.watch: letzteres abonniert bei jedem Rendern neu.
  const accountType = useWatch({ control, name: 'accountType' }) ?? 'PRIVATE';
  const istHaendler = accountType === 'DEALER';

  /**
   * Die Schemata melden teils Schlüssel statt Sätzen. Übersetzt wird erst
   * hier, wo die Sprache feststeht; alles andere geht unverändert durch.
   */
  const meldung = (schluessel?: string) =>
    schluessel ? (t.has(schluessel) ? t(schluessel) : schluessel) : undefined;

  async function submit(values: RegisterInput) {
    const result = await registerAction(values);

    if (!result.ok) {
      for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
        setError(field as keyof RegisterFormInput, { message: messages[0] });
      }
      if (!result.fieldErrors) toast.error(meldung(result.error) ?? result.error);
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

    // Ein Händler landet auf der Prüfung: ohne sie fehlt ihm das Abzeichen,
    // und er soll gleich sehen, was dafür nötig ist.
    const ziel = istHaendler ? '/dashboard/verification' : '/dashboard';

    router.push(signedIn && !signedIn.error ? ziel : '/login');
    // Siehe login-form.tsx: ohne refresh zeigt die Kopfzeile weiter den
    // abgemeldeten Zustand.
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
      {/* Die Wahl steht ganz oben: sie ändert, was darunter gefragt wird. */}
      <div role="group" aria-label={t('accountType')} className="bg-muted flex gap-1 rounded-lg p-1">
        {(
          [
            { value: 'PRIVATE', label: t('accountPrivate'), icon: User },
            { value: 'DEALER', label: t('accountDealer'), icon: Building2 },
          ] as { value: AccountType; label: string; icon: typeof User }[]
        ).map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            aria-pressed={accountType === value}
            onClick={() => setValue('accountType', value, { shouldValidate: false })}
            className={cn(
              'inline-flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              accountType === value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </button>
        ))}
      </div>

      <p className="text-muted-foreground -mt-1 text-xs leading-relaxed">
        {istHaendler ? t('accountDealerHint') : t('accountPrivateHint')}
      </p>

      {istHaendler ? (
        <>
          <Field
            id="companyName"
            label={t('companyName')}
            error={meldung(errors.companyName?.message)}
          >
            <Input
              id="companyName"
              autoComplete="organization"
              className="h-11"
              {...register('companyName')}
            />
          </Field>

          <Field
            id="registrationNumber"
            label={t('registrationNumber')}
            hint={t('registrationNumberHint')}
            error={meldung(errors.registrationNumber?.message)}
          >
            <Input
              id="registrationNumber"
              inputMode="numeric"
              className="h-11"
              {...register('registrationNumber')}
            />
          </Field>
        </>
      ) : null}

      <Field
        id="name"
        label={istHaendler ? t('contactName') : t('name')}
        error={meldung(errors.name?.message)}
      >
        <Input id="name" autoComplete="name" className="h-11" {...register('name')} />
      </Field>

      <Field id="email" label={t('email')} error={meldung(errors.email?.message)}>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          className="h-11"
          {...register('email')}
        />
      </Field>

      <Field id="password" label={t('password')} error={meldung(errors.password?.message)}>
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
        error={meldung(errors.confirmPassword?.message)}
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
            {meldung(errors.acceptTerms.message)}
          </p>
        ) : null}
      </div>

      <Button type="submit" size="lg" className="h-11 w-full" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        {istHaendler ? t('submitRegisterDealer') : t('submitRegister')}
      </Button>
    </form>
  );
}
