import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { PackageForm } from '@/features/admin/components/package-form';
import { prisma } from '@/lib/db';

export const metadata: Metadata = { robots: { index: false } };

type PageProps = { params: Promise<{ locale: string }> };

export default async function AdminPackagesPage({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations('admin.packages');

  const packages = await prisma.package.findMany({
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      tier: true,
      nameSq: true,
      nameDe: true,
      nameEn: true,
      priceCents: true,
      listingLimit: true,
      listingDurationDays: true,
      photoLimit: true,
      featuredScore: true,
      featuredDays: true,
      active: true,
    },
  });

  const name = (row: (typeof packages)[number]) =>
    locale === 'de' ? row.nameDe : locale === 'en' ? row.nameEn : row.nameSq;

  return (
    <div>
      <h2 className="text-lg font-semibold">{t('title')}</h2>
      <p className="text-muted-foreground mt-1 text-sm">{t('subtitle')}</p>

      <div className="mt-4 space-y-3">
        {packages.map((row) => (
          <PackageForm
            key={row.id}
            pkg={{
              id: row.id,
              tier: row.tier,
              name: name(row),
              priceCents: row.priceCents,
              listingLimit: row.listingLimit,
              listingDurationDays: row.listingDurationDays,
              photoLimit: row.photoLimit,
              featuredScore: row.featuredScore,
              featuredDays: row.featuredDays,
              active: row.active,
            }}
          />
        ))}
      </div>
    </div>
  );
}
