'use client';

import { Loader2, Save } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { savePackageAction } from '@/features/admin/actions';
import { useRouter } from '@/lib/i18n/navigation';

export type EditablePackage = {
  id: string;
  tier: string;
  name: string;
  priceCents: number;
  listingLimit: number | null;
  listingDurationDays: number;
  photoLimit: number;
  featuredScore: number;
  featuredDays: number;
  active: boolean;
};

/** Die Zahlenfelder eines Pakets, in der Reihenfolge der Bearbeitung. */
const NUMBER_FIELDS = [
  { key: 'listingDurationDays', label: 'duration', step: 5 },
  { key: 'photoLimit', label: 'photos', step: 5 },
  { key: 'featuredScore', label: 'featuredScore', step: 5 },
  { key: 'featuredDays', label: 'featuredDays', step: 1 },
] as const;

export function PackageForm({ pkg }: { pkg: EditablePackage }) {
  const t = useTranslations('admin.packages');
  const router = useRouter();

  // Der Preis steht in Cent, wird aber in Euro bearbeitet. Ein leeres
  // Grenzfeld bedeutet „unbegrenzt“ und wird als null gespeichert.
  const [form, setForm] = useState({
    price: String(pkg.priceCents / 100),
    listingLimit: pkg.listingLimit === null ? '' : String(pkg.listingLimit),
    listingDurationDays: String(pkg.listingDurationDays),
    photoLimit: String(pkg.photoLimit),
    featuredScore: String(pkg.featuredScore),
    featuredDays: String(pkg.featuredDays),
  });
  const [active, setActive] = useState(pkg.active);
  const [saving, setSaving] = useState(false);

  const isFree = pkg.tier === 'FREE';

  async function save() {
    setSaving(true);

    const result = await savePackageAction({
      id: pkg.id,
      priceCents: Math.round(Number(form.price) * 100),
      listingLimit: form.listingLimit.trim() === '' ? null : Number(form.listingLimit),
      listingDurationDays: Number(form.listingDurationDays),
      photoLimit: Number(form.photoLimit),
      featuredScore: Number(form.featuredScore),
      featuredDays: Number(form.featuredDays),
      active,
    });

    setSaving(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(t('saved'));
    router.refresh();
  }

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
      setForm((current) => ({ ...current, [key]: event.target.value })),
  });

  return (
    <article className="bg-card text-card-foreground rounded-xl border p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold">{pkg.name}</h3>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={active}
            disabled={isFree}
            onChange={(event) => setActive(event.target.checked)}
            className="accent-primary size-4"
          />
          {t('active')}
        </label>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div className="space-y-1.5">
          <Label htmlFor={`${pkg.id}-price`}>{t('price')}</Label>
          <Input
            id={`${pkg.id}-price`}
            type="number"
            inputMode="decimal"
            step={1}
            min={0}
            disabled={isFree}
            className="h-10"
            {...field('price')}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`${pkg.id}-limit`}>{t('listingLimit')}</Label>
          <Input
            id={`${pkg.id}-limit`}
            type="number"
            inputMode="numeric"
            step={1}
            min={1}
            placeholder={t('unlimited')}
            className="h-10"
            {...field('listingLimit')}
          />
        </div>

        {NUMBER_FIELDS.map((entry) => (
          <div key={entry.key} className="space-y-1.5">
            <Label htmlFor={`${pkg.id}-${entry.key}`}>{t(entry.label)}</Label>
            <Input
              id={`${pkg.id}-${entry.key}`}
              type="number"
              inputMode="numeric"
              step={entry.step}
              min={0}
              className="h-10"
              {...field(entry.key)}
            />
          </div>
        ))}
      </div>

      <Button size="sm" className="mt-4" onClick={save} disabled={saving}>
        {saving ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <Save className="size-4" aria-hidden />
        )}
        {t('save')}
      </Button>
    </article>
  );
}
