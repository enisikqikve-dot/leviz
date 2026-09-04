import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { SettingsForm, type SettingsValues } from '@/features/admin/components/settings-form';
import { prisma } from '@/lib/db';

export const metadata: Metadata = { robots: { index: false } };

/** Vorgaben, falls ein Wert noch nie gesetzt wurde. */
const DEFAULTS: SettingsValues = {
  'currency.eurToAll': 100.5,
  'listing.defaultDurationDays': 60,
  'moderation.suspiciousPriceFloorCents': 50_000,
  'search.pageSize': 24,
  'search.defaultRadiusKm': 50,
};

export default async function AdminSettingsPage() {
  const t = await getTranslations('admin.settings');

  const stored = await prisma.platformSetting.findMany({
    where: { key: { in: Object.keys(DEFAULTS) } },
    select: { key: true, value: true },
  });

  const values = { ...DEFAULTS };
  for (const setting of stored) {
    if (typeof setting.value === 'number' && setting.key in values) {
      values[setting.key as keyof SettingsValues] = setting.value;
    }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold">{t('title')}</h2>
      <SettingsForm values={values} />
    </div>
  );
}
