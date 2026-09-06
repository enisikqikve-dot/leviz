'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { FileCheck2, Loader2, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/features/auth/components/field';
import { compressImage } from '@/features/listings/compress';
import { submitVerificationAction } from '@/features/verification/actions';
import {
  REQUIRED_DOCUMENTS,
  verificationSchema,
  type DocumentType,
  type VerificationFormInput,
  type VerificationInput,
  type VerificationKind,
} from '@/features/verification/schemas';
import { DOCUMENT_ACCEPT, MAX_DOCUMENT_BYTES } from '@/lib/storage/document';
import { useRouter } from '@/lib/i18n/navigation';
import { cn } from '@/lib/utils';

/**
 * Antrag auf Prüfung: Angaben und Belege in einem Formular.
 *
 * Die Bilder werden im Browser verkleinert, bevor sie losgehen. Ein Ausweis
 * vom Handy hat schnell vier Megabyte; vier davon sprengen die Grenze für eine
 * Server Action, und für das Lesen einer Ausweisnummer reicht die kleinere
 * Fassung allemal. PDFs bleiben unangetastet — sie lassen sich nicht über eine
 * Zeichenfläche schicken, ohne Seiten zu verlieren.
 */
export function VerificationForm({ kind }: { kind: VerificationKind }) {
  const t = useTranslations('verification');
  const router = useRouter();

  const erforderlich = REQUIRED_DOCUMENTS[kind];
  const [dateien, setDateien] = useState<Partial<Record<DocumentType, File>>>({});
  const [fehlend, setFehlend] = useState<DocumentType[]>([]);
  const [laeuft, setLaeuft] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<VerificationFormInput, unknown, VerificationInput>({
    resolver: zodResolver(verificationSchema),
    defaultValues: {
      kind,
      legalName: '',
      addressLine: '',
      postalCode: '',
      city: '',
      companyName: '',
      registrationNumber: '',
    },
  });

  function waehle(type: DocumentType, datei: File | undefined) {
    if (datei && datei.size > MAX_DOCUMENT_BYTES) {
      toast.error(t('errorTooLarge'));
      return;
    }

    setDateien((current) => ({ ...current, [type]: datei }));
    setFehlend((current) => current.filter((eintrag) => eintrag !== type));
  }

  async function submit(values: VerificationInput) {
    const luecken = erforderlich.filter((type) => !dateien[type]);

    if (luecken.length > 0) {
      setFehlend(luecken);
      toast.error(t('errorMissingDocuments'));
      return;
    }

    setLaeuft(true);

    try {
      const body = new FormData();
      body.append('kind', kind);
      body.append('legalName', values.legalName);
      body.append('addressLine', values.addressLine);
      body.append('postalCode', values.postalCode ?? '');
      body.append('city', values.city);
      body.append('companyName', values.companyName ?? '');
      body.append('registrationNumber', values.registrationNumber ?? '');

      for (const type of erforderlich) {
        const datei = dateien[type];
        if (!datei) continue;

        const gesendet =
          datei.type === 'application/pdf' ? datei : (await compressImage(datei)).file;

        body.append(`document:${type}`, gesendet, gesendet.name);
      }

      const result = await submitVerificationAction(body);

      if (!result.ok) {
        for (const [feld, meldungen] of Object.entries(result.fieldErrors ?? {})) {
          setError(feld as keyof VerificationFormInput, {
            message: t.has(meldungen[0]) ? t(meldungen[0]) : meldungen[0],
          });
        }
        if (!result.fieldErrors) {
          toast.error(t.has(result.error) ? t(result.error) : result.error);
        }
        return;
      }

      toast.success(t('submitted'));
      router.refresh();
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit(submit)}
      className="bg-card text-card-foreground space-y-6 rounded-2xl border p-6 sm:p-8"
      noValidate
    >
      <Field
        id="legalName"
        label={t('legalName')}
        hint={t('legalNameHint')}
        error={errors.legalName?.message}
      >
        <Input id="legalName" className="h-11" autoComplete="name" {...register('legalName')} />
      </Field>

      {kind === 'DEALER' ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="companyName" label={t('companyName')} error={errors.companyName?.message}>
            <Input id="companyName" className="h-11" {...register('companyName')} />
          </Field>
          <Field
            id="registrationNumber"
            label={t('registrationNumber')}
            hint={t('registrationNumberHint')}
            error={errors.registrationNumber?.message}
          >
            <Input id="registrationNumber" className="h-11" {...register('registrationNumber')} />
          </Field>
        </div>
      ) : null}

      <Field id="addressLine" label={t('addressLine')} error={errors.addressLine?.message}>
        <Input
          id="addressLine"
          className="h-11"
          autoComplete="street-address"
          {...register('addressLine')}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
        <Field id="postalCode" label={t('postalCode')} error={errors.postalCode?.message}>
          <Input
            id="postalCode"
            className="h-11"
            autoComplete="postal-code"
            {...register('postalCode')}
          />
        </Field>
        <Field id="city" label={t('city')} error={errors.city?.message}>
          <Input
            id="city"
            className="h-11"
            autoComplete="address-level2"
            {...register('city')}
          />
        </Field>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold">{t('documents')}</h2>

        {erforderlich.map((type) => (
          <DocumentSlot
            key={type}
            type={type}
            label={t(`documentTypes.${type}`)}
            hint={t(`documentHints.${type}`)}
            datei={dateien[type]}
            missing={fehlend.includes(type)}
            onChange={(datei) => waehle(type, datei)}
          />
        ))}
      </div>

      <p className="text-muted-foreground text-xs">{t('privacyNote')}</p>

      <Button type="submit" size="lg" className="w-full" disabled={laeuft}>
        {laeuft ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        {t('submit')}
      </Button>
    </form>
  );
}

function DocumentSlot({
  type,
  label,
  hint,
  datei,
  missing,
  onChange,
}: {
  type: DocumentType;
  label: string;
  hint: string;
  datei: File | undefined;
  missing: boolean;
  onChange: (datei: File | undefined) => void;
}) {
  const t = useTranslations('verification');
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-3 rounded-xl border p-3',
        missing ? 'border-destructive' : 'border-border',
      )}
    >
      <span
        className={cn(
          'inline-flex size-10 shrink-0 items-center justify-center rounded-lg',
          datei ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground',
        )}
      >
        {datei ? (
          <FileCheck2 className="size-5" aria-hidden />
        ) : (
          <Upload className="size-5" aria-hidden />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-muted-foreground truncate text-xs">{datei ? datei.name : hint}</p>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
      >
        {datei ? t('replaceFile') : t('chooseFile')}
      </Button>

      <input
        ref={inputRef}
        id={`document-${type}`}
        type="file"
        accept={DOCUMENT_ACCEPT}
        className="sr-only"
        onChange={(event) => {
          onChange(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
    </div>
  );
}
