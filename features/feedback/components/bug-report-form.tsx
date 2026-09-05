'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { submitBugReportAction } from '@/features/feedback/actions';
import {
  BUG_KINDS,
  MESSAGE_MAX,
  bugReportSchema,
  type BugReportFormInput,
  type BugReportInput,
} from '@/features/feedback/schemas';
import { Field } from '@/features/auth/components/field';

export function BugReportForm({ signedInEmail }: { signedInEmail: string | null }) {
  const t = useTranslations('feedback');
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BugReportFormInput, unknown, BugReportInput>({
    resolver: zodResolver(bugReportSchema),
    defaultValues: { kind: 'BUG', message: '', email: '', pageUrl: '' },
  });

  // Woher der Melder kam, ist der wichtigste Hinweis zum Nachstellen. Das
  // Feld bleibt sichtbar und aenderbar: eine still mitgesendete Adresse
  // waere eine Angabe ueber den Nutzer, die er nicht bemerkt.
  useEffect(() => {
    if (document.referrer && document.referrer.startsWith(window.location.origin)) {
      setValue('pageUrl', document.referrer);
    }
  }, [setValue]);

  // useWatch statt form.watch: letzteres laesst sich nicht merken und
  // abonniert bei jedem Rendern neu.
  const kind = useWatch({ control, name: 'kind' });
  const message = useWatch({ control, name: 'message' }) ?? '';

  async function submit(values: BugReportInput) {
    const result = await submitBugReportAction(values);

    if (!result.ok) {
      for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
        setError(field as keyof BugReportFormInput, { message: messages[0] });
      }
      if (!result.fieldErrors) {
        toast.error(t.has(result.error) ? t(result.error) : result.error);
      }
      return;
    }

    reset();
    setSent(true);
  }

  if (sent) {
    return (
      <div className="bg-card text-card-foreground rounded-2xl border p-6 text-center sm:p-8">
        <CheckCircle2 className="text-success mx-auto size-10" aria-hidden />
        <h2 className="mt-4 text-lg font-semibold">{t('thanksTitle')}</h2>
        <p className="text-muted-foreground mt-2 text-sm">{t('thanksBody')}</p>

        <Button variant="outline" className="mt-6" onClick={() => setSent(false)}>
          {t('reportAnother')}
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(submit)}
      className="bg-card text-card-foreground space-y-5 rounded-2xl border p-6 sm:p-8"
      noValidate
    >
      <Field id="kind" label={t('kind')} error={errors.kind?.message}>
        <Select
          value={kind}
          onValueChange={(value) =>
            setValue('kind', value as BugReportFormInput['kind'], { shouldDirty: true })
          }
        >
          <SelectTrigger id="kind" className="h-11 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BUG_KINDS.map((value) => (
              <SelectItem key={value} value={value}>
                {t(`kinds.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field
        id="message"
        label={t('message')}
        hint={t('messageHint')}
        error={errors.message?.message}
      >
        <textarea
          id="message"
          rows={6}
          maxLength={MESSAGE_MAX}
          placeholder={t('messagePlaceholder')}
          className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-[3px]"
          {...register('message')}
        />
      </Field>

      <p className="text-muted-foreground -mt-3 text-right text-xs tabular-nums">
        {message.length} / {MESSAGE_MAX}
      </p>

      <Field id="pageUrl" label={t('pageUrl')} hint={t('pageUrlHint')}>
        <Input id="pageUrl" className="h-11" {...register('pageUrl')} />
      </Field>

      {signedInEmail ? (
        <p className="text-muted-foreground text-sm">
          {t('signedInAs', { email: signedInEmail })}
        </p>
      ) : (
        <Field
          id="email"
          label={t('email')}
          hint={t('emailHint')}
          error={errors.email?.message}
        >
          <Input id="email" type="email" autoComplete="email" className="h-11" {...register('email')} />
        </Field>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        {t('submit')}
      </Button>
    </form>
  );
}
