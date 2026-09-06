'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Copy, Loader2, TicketPercent } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Field } from '@/features/auth/components/field';
import { createVouchersAction } from '@/features/vouchers/actions';
import { MAX_GENERATED_CODES } from '@/features/vouchers/discount';
import {
  createVoucherSchema,
  type CreateVoucherFormInput,
  type CreateVoucherInput,
} from '@/features/vouchers/schemas';
import { useRouter } from '@/lib/i18n/navigation';

type PackageOption = { id: string; name: string };

/**
 * Codes anlegen — einen oder hundert.
 *
 * Die erzeugten Codes erscheinen danach zum Kopieren. Ohne das wären hundert
 * Codes zwar in der Datenbank, aber nirgends greifbar; abtippen ist keine
 * Lösung.
 */
export function VoucherForm({ packages }: { packages: PackageOption[] }) {
  const t = useTranslations('admin.vouchers');
  const router = useRouter();
  const [erzeugt, setErzeugt] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateVoucherFormInput, unknown, CreateVoucherInput>({
    resolver: zodResolver(createVoucherSchema),
    defaultValues: {
      kind: 'PERCENT',
      percentOff: 100,
      amountOffEuro: '',
      packageId: '',
      maxRedemptions: 1,
      count: 1,
      prefix: 'LEVIZ',
      label: '',
      validUntil: '',
    },
  });

  const kind = useWatch({ control, name: 'kind' }) ?? 'PERCENT';
  const paket = useWatch({ control, name: 'packageId' }) ?? '';

  const meldung = (schluessel?: string) =>
    schluessel ? (t.has(schluessel) ? t(schluessel) : schluessel) : undefined;

  async function submit(values: CreateVoucherInput) {
    const result = await createVouchersAction(values);

    if (!result.ok) {
      for (const [feld, meldungen] of Object.entries(result.fieldErrors ?? {})) {
        setError(feld as keyof CreateVoucherFormInput, { message: meldungen[0] });
      }
      if (!result.fieldErrors) toast.error(meldung(result.error) ?? result.error);
      return;
    }

    setErzeugt(result.data.codes);
    toast.success(t('created', { count: result.data.codes.length }));
    reset({ ...values, count: values.count, label: values.label ?? '' });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={handleSubmit(submit, (fehler) => {
          // Ein Fehler kann an einem Feld haengen, das gerade nicht sichtbar
          // ist. Ohne diesen Hinweis passierte auf den Knopf hin scheinbar
          // nichts.
          const erster = Object.values(fehler)[0]?.message;
          if (erster) toast.error(meldung(String(erster)) ?? String(erster));
        })}
        className="bg-card space-y-4 rounded-xl border p-4"
        noValidate
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="kind" label={t('kind')} error={meldung(errors.kind?.message)}>
            <Select
              value={kind}
              onValueChange={(value) =>
                setValue('kind', value as CreateVoucherInput['kind'], { shouldValidate: true })
              }
            >
              <SelectTrigger id="kind" className="h-10 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PERCENT">{t('kindPercent')}</SelectItem>
                <SelectItem value="AMOUNT">{t('kindAmount')}</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          {kind === 'PERCENT' ? (
            <Field
              id="percentOff"
              label={t('percentOff')}
              hint={t('percentHint')}
              error={meldung(errors.percentOff?.message)}
            >
              <Input
                id="percentOff"
                type="number"
                min={1}
                max={100}
                className="h-10"
                {...register('percentOff')}
              />
            </Field>
          ) : (
            <Field
              id="amountOffEuro"
              label={t('amountOff')}
              error={meldung(errors.amountOffEuro?.message)}
            >
              <Input
                id="amountOffEuro"
                type="number"
                step="0.01"
                min={0.01}
                className="h-10"
                {...register('amountOffEuro')}
              />
            </Field>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="packageId" label={t('package')} hint={t('packageHint')}>
            <Select
              value={paket || 'ALL'}
              onValueChange={(value) => setValue('packageId', value === 'ALL' ? '' : value)}
            >
              <SelectTrigger id="packageId" className="h-10 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t('allPackages')}</SelectItem>
                {packages.map((pkg) => (
                  <SelectItem key={pkg.id} value={pkg.id}>
                    {pkg.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field
            id="validUntil"
            label={t('validUntil')}
            hint={t('validUntilHint')}
            error={meldung(errors.validUntil?.message)}
          >
            <Input id="validUntil" type="date" className="h-10" {...register('validUntil')} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            id="count"
            label={t('count')}
            hint={t('countHint', { max: MAX_GENERATED_CODES })}
            error={meldung(errors.count?.message)}
          >
            <Input
              id="count"
              type="number"
              min={1}
              max={MAX_GENERATED_CODES}
              className="h-10"
              {...register('count')}
            />
          </Field>

          <Field
            id="maxRedemptions"
            label={t('maxRedemptions')}
            hint={t('maxRedemptionsHint')}
            error={meldung(errors.maxRedemptions?.message)}
          >
            <Input
              id="maxRedemptions"
              type="number"
              min={1}
              className="h-10"
              {...register('maxRedemptions')}
            />
          </Field>

          <Field id="prefix" label={t('prefix')} error={meldung(errors.prefix?.message)}>
            <Input id="prefix" className="h-10 uppercase" {...register('prefix')} />
          </Field>
        </div>

        <Field id="label" label={t('label')} hint={t('labelHint')}>
          <Input id="label" className="h-10" {...register('label')} />
        </Field>

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <TicketPercent className="size-4" aria-hidden />
          )}
          {t('create')}
        </Button>
      </form>

      {erzeugt.length > 0 ? (
        <div className="bg-card rounded-xl border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">{t('createdTitle', { count: erzeugt.length })}</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                void navigator.clipboard.writeText(erzeugt.join('\n'));
                toast.success(t('copied'));
              }}
            >
              <Copy className="size-3.5" aria-hidden />
              {t('copy')}
            </Button>
          </div>

          <textarea
            readOnly
            rows={Math.min(12, erzeugt.length + 1)}
            value={erzeugt.join('\n')}
            className="border-input bg-background mt-3 w-full rounded-md border px-3 py-2 font-mono text-xs"
          />
        </div>
      ) : null}
    </div>
  );
}
