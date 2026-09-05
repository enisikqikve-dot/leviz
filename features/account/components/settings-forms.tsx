'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  changePasswordAction,
  updateNotificationsAction,
  updateProfileAction,
} from '@/features/account/actions';
import type { SettingsData } from '@/features/account/data';
import {
  changePasswordSchema,
  notificationsSchema,
  profileSchema,
  type ChangePasswordInput,
  type NotificationsInput,
  type ProfileFormInput,
  type ProfileInput,
} from '@/features/account/schemas';
import { Field } from '@/features/auth/components/field';
import { locales } from '@/lib/i18n/routing';

/** Kein Wert ausgewählt. Ein leerer Wert ist in einem Select nicht erlaubt. */
const NONE = '__none__';

/**
 * Die Aktionen liefern Übersetzungsschlüssel. Alles, was keiner ist — etwa eine
 * Meldung aus dem Zod-Schema — wird unverändert durchgereicht, damit nie ein
 * roher Schlüssel auf der Seite landet.
 */
function useMessage() {
  const t = useTranslations('account');
  return (value: string) => (t.has(value) ? t(value) : value);
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-card text-card-foreground shadow-card rounded-2xl border p-6 sm:p-8">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <p className="text-muted-foreground mt-1 text-sm">{description}</p>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function SubmitButton({ busy, label }: { busy: boolean; label: string }) {
  return (
    <Button type="submit" disabled={busy}>
      {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
      {label}
    </Button>
  );
}

export function SettingsForms({ data }: { data: SettingsData }) {
  return (
    <div className="space-y-6">
      <ProfileSection data={data} />
      <NotificationsSection data={data} />
      <PasswordSection hasPassword={data.hasPassword} />
    </div>
  );
}

// ---------------------------------------------------------------------------

function ProfileSection({ data }: { data: SettingsData }) {
  const t = useTranslations('account');
  const message = useMessage();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormInput, unknown, ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: data.name,
      phone: data.phone ?? '',
      citySlug: data.citySlug ?? '',
      locale: data.locale,
    },
  });

  // useWatch abonniert die Werte reaktiv; form.watch() kann nicht gemerkt
  // werden und laesst React bei jedem Rendern neu abonnieren.
  const citySlug = useWatch({ control, name: 'citySlug' });
  const locale = useWatch({ control, name: 'locale' });

  async function submit(values: ProfileInput) {
    const result = await updateProfileAction(values);

    if (!result.ok) {
      for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
        setError(field as keyof ProfileFormInput, { message: message(messages[0]) });
      }
      if (!result.fieldErrors) toast.error(message(result.error));
      return;
    }

    toast.success(t('saved'));
    // Die Sprachwahl wirkt sich auf spätere E-Mails aus; die Seite lädt die
    // gespeicherten Werte neu, damit Anzeige und Datenbank übereinstimmen.
    router.refresh();
  }

  return (
    <Section title={t('profileTitle')} description={t('profileDescription')}>
      <form onSubmit={handleSubmit(submit)} className="space-y-5" noValidate>
        <Field id="name" label={t('name')} error={errors.name?.message}>
          <Input id="name" autoComplete="name" className="h-11" {...register('name')} />
        </Field>

        <Field
          id="phone"
          label={t('phone')}
          hint={t('phoneHint')}
          error={errors.phone?.message}
        >
          <Input
            id="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+383 44 123 456"
            className="h-11"
            {...register('phone')}
          />
        </Field>

        <Field id="citySlug" label={t('city')} error={errors.citySlug?.message}>
          <Select
            value={citySlug === '' ? NONE : citySlug}
            onValueChange={(value) =>
              setValue('citySlug', value === NONE ? '' : value, { shouldDirty: true })
            }
          >
            <SelectTrigger id="citySlug" className="h-11 w-full">
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>{t('cityNone')}</SelectItem>
              {data.cities.map((city) => (
                <SelectItem key={city.slug} value={city.slug}>
                  {city.name} ({city.countryCode})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field
          id="locale"
          label={t('language')}
          hint={t('languageHint')}
          error={errors.locale?.message}
        >
          <Select
            value={locale}
            onValueChange={(value) =>
              setValue('locale', value as ProfileFormInput['locale'], { shouldDirty: true })
            }
          >
            <SelectTrigger id="locale" className="h-11 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {locales.map((value) => (
                <SelectItem key={value} value={value}>
                  {t(`languages.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <div className="space-y-1.5">
          <Label>{t('email')}</Label>
          <Input value={data.email ?? '—'} readOnly disabled className="h-11" />
          <p className="text-muted-foreground text-xs">{t('emailHint')}</p>
        </div>

        <SubmitButton busy={isSubmitting} label={t('save')} />
      </form>
    </Section>
  );
}

// ---------------------------------------------------------------------------

function NotificationsSection({ data }: { data: SettingsData }) {
  const t = useTranslations('account');
  const message = useMessage();

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<NotificationsInput>({
    resolver: zodResolver(notificationsSchema),
    defaultValues: {
      notifyByEmail: data.notifyByEmail,
      notifyBySms: data.notifyBySms,
    },
  });

  async function submit(values: NotificationsInput) {
    const result = await updateNotificationsAction(values);
    if (!result.ok) {
      toast.error(message(result.error));
      return;
    }
    toast.success(t('saved'));
  }

  return (
    <Section title={t('notifyTitle')} description={t('notifyDescription')}>
      <form onSubmit={handleSubmit(submit)} className="space-y-5">
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="border-input accent-primary mt-0.5 size-4 rounded"
            {...register('notifyByEmail')}
          />
          <span>
            <span className="font-medium">{t('notifyByEmail')}</span>
            <span className="text-muted-foreground block text-xs">
              {t('notifyByEmailHint')}
            </span>
          </span>
        </label>

        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="border-input accent-primary mt-0.5 size-4 rounded"
            {...register('notifyBySms')}
          />
          <span>
            <span className="font-medium">{t('notifyBySms')}</span>
            <span className="text-muted-foreground block text-xs">
              {t('notifyBySmsHint')}
            </span>
          </span>
        </label>

        <SubmitButton busy={isSubmitting} label={t('save')} />
      </form>
    </Section>
  );
}

// ---------------------------------------------------------------------------

function PasswordSection({ hasPassword }: { hasPassword: boolean }) {
  const t = useTranslations('account');
  const message = useMessage();

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', password: '', confirmPassword: '' },
  });

  async function submit(values: ChangePasswordInput) {
    const result = await changePasswordAction(values);

    if (!result.ok) {
      for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
        setError(field as keyof ChangePasswordInput, { message: message(messages[0]) });
      }
      if (!result.fieldErrors) toast.error(message(result.error));
      return;
    }

    // Die Felder leeren: ein stehengebliebenes Passwort im Formular ist ein
    // unnötiges Risiko an einem geteilten Rechner.
    reset();
    toast.success(t('passwordChanged'));
  }

  if (!hasPassword) {
    return (
      <Section title={t('passwordTitle')} description={t('passwordDescription')}>
        <p className="text-muted-foreground text-sm">{t('passwordNone')}</p>
      </Section>
    );
  }

  return (
    <Section title={t('passwordTitle')} description={t('passwordDescription')}>
      <form onSubmit={handleSubmit(submit)} className="space-y-5" noValidate>
        <Field
          id="currentPassword"
          label={t('currentPassword')}
          error={errors.currentPassword?.message}
        >
          <Input
            id="currentPassword"
            type="password"
            autoComplete="current-password"
            className="h-11"
            {...register('currentPassword')}
          />
        </Field>

        <Field
          id="password"
          label={t('newPassword')}
          hint={t('passwordHint')}
          error={errors.password?.message}
        >
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

        <SubmitButton busy={isSubmitting} label={t('changePassword')} />
      </form>
    </Section>
  );
}
