'use client';

import { Loader2, Save } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { saveSettingsAction } from '@/features/admin/actions';
import { useRouter } from '@/lib/i18n/navigation';

export type SettingsValues = {
  'currency.eurToAll': number;
  'listing.defaultDurationDays': number;
  'moderation.suspiciousPriceFloorCents': number;
  'search.pageSize': number;
  'search.defaultRadiusKm': number;
};

const FIELDS = [
  { key: 'currency.eurToAll', label: 'eurToAll', hint: 'eurToAllHint', step: 0.1 },
  { key: 'listing.defaultDurationDays', label: 'listingDuration', step: 1 },
  { key: 'moderation.suspiciousPriceFloorCents', label: 'priceFloor', hint: 'priceFloorHint', step: 50, euro: true },
  { key: 'search.pageSize', label: 'pageSize', step: 6 },
  { key: 'search.defaultRadiusKm', label: 'defaultRadius', step: 5 },
] as const;

export function SettingsForm({ values }: { values: SettingsValues }) {
  const t = useTranslations('admin.settings');
  const router = useRouter();

  // Die Preisuntergrenze steht in Cent, wird aber in Euro bearbeitet.
  const [form, setForm] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      FIELDS.map((field) => [
        field.key,
        String(
          'euro' in field && field.euro
            ? values[field.key] / 100
            : values[field.key as keyof SettingsValues],
        ),
      ]),
    ),
  );
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);

    const payload = Object.fromEntries(
      FIELDS.map((field) => {
        const raw = Number(form[field.key]);
        return [field.key, 'euro' in field && field.euro ? Math.round(raw * 100) : raw];
      }),
    );

    const result = await saveSettingsAction(payload);
    setSaving(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(t('saved'));
    router.refresh();
  }

  return (
    <div className="bg-card mt-4 max-w-lg rounded-xl border p-5">
      <div className="space-y-5">
        {FIELDS.map((field) => (
          <div key={field.key} className="space-y-1.5">
            <Label htmlFor={field.key}>{t(field.label)}</Label>
            <Input
              id={field.key}
              type="number"
              inputMode="decimal"
              step={field.step}
              value={form[field.key]}
              onChange={(event) =>
                setForm((current) => ({ ...current, [field.key]: event.target.value }))
              }
              className="h-11"
            />
            {'hint' in field && field.hint ? (
              <p className="text-muted-foreground text-xs">{t(field.hint)}</p>
            ) : null}
          </div>
        ))}
      </div>

      <Button className="mt-6 h-11" onClick={save} disabled={saving}>
        {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Save className="size-4" aria-hidden />}
        {t('save')}
      </Button>
    </div>
  );
}
