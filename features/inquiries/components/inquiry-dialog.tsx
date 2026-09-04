'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Loader2, MessageSquare } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Field } from '@/features/auth/components/field';
import { sendInquiryAction } from '@/features/inquiries/actions';
import { inquirySchema, type InquiryInput } from '@/features/inquiries/schemas';

export function InquiryDialog({
  vehicleId,
  defaultName,
  defaultEmail,
}: {
  vehicleId: string;
  defaultName?: string | null;
  defaultEmail?: string | null;
}) {
  const t = useTranslations('inquiry');
  const td = useTranslations('vehicleDetail');
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<InquiryInput>({
    resolver: zodResolver(inquirySchema),
    defaultValues: {
      vehicleId,
      name: defaultName ?? '',
      email: defaultEmail ?? '',
      phone: '',
      message: '',
    },
  });

  async function submit(values: InquiryInput) {
    const result = await sendInquiryAction(values);

    if (!result.ok) {
      for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
        setError(field as keyof InquiryInput, { message: messages[0] });
      }
      if (!result.fieldErrors) toast.error(result.error);
      return;
    }

    setSent(true);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        // Nach dem Schließen wieder das Formular zeigen, nicht die Bestätigung.
        if (!next) setTimeout(() => setSent(false), 200);
      }}
    >
      <DialogTrigger asChild>
        <Button size="lg" className="h-11 w-full">
          <MessageSquare className="size-4" aria-hidden />
          {td('contactSeller')}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        {sent ? (
          <div className="flex flex-col items-center py-6 text-center">
            <span className="bg-success/10 text-success inline-flex size-12 items-center justify-center rounded-full">
              <CheckCircle2 className="size-6" aria-hidden />
            </span>
            <p className="mt-4 text-base font-semibold">{t('success')}</p>
            <p className="text-muted-foreground mt-1 text-sm">{t('successHint')}</p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{t('title')}</DialogTitle>
              <DialogDescription>{t('subtitle')}</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
              <input type="hidden" {...register('vehicleId')} />

              <Field id="inq-name" label={t('name')} error={errors.name?.message}>
                <Input id="inq-name" autoComplete="name" className="h-11" {...register('name')} />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="inq-email" label={t('email')} error={errors.email?.message}>
                  <Input id="inq-email" type="email" autoComplete="email" className="h-11" {...register('email')} />
                </Field>
                <Field id="inq-phone" label={t('phone')} error={errors.phone?.message}>
                  <Input id="inq-phone" type="tel" autoComplete="tel" placeholder="044 123 456" className="h-11" {...register('phone')} />
                </Field>
              </div>
              <p className="text-muted-foreground -mt-2 text-xs">{t('contactHint')}</p>

              <Field id="inq-message" label={t('message')} error={errors.message?.message}>
                <textarea
                  id="inq-message"
                  rows={4}
                  placeholder={t('messagePlaceholder')}
                  className="border-input bg-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
                  {...register('message')}
                />
              </Field>

              <Button type="submit" size="lg" className="h-11 w-full" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                {t('submit')}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
