import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { BrandPopularToggle } from '@/features/admin/components/row-actions';
import { listBrandsForAdmin } from '@/features/admin/queries';
import { formatNumber } from '@/lib/currency';
import type { Locale } from '@/lib/i18n/routing';

export const metadata: Metadata = { robots: { index: false } };

export default async function AdminBrandsPage({
  params,
}: PageProps<'/[locale]/admin/brands'>) {
  const { locale } = await params;
  const t = await getTranslations('admin.brands');

  const brands = await listBrandsForAdmin();

  return (
    <div>
      <h2 className="text-lg font-semibold">{t('title')}</h2>

      <div className="mt-4 overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[32rem] border-collapse text-sm">
          <thead>
            <tr className="bg-surface">
              <th className="border-b px-4 py-3 text-start font-semibold">{t('brandName')}</th>
              <th className="border-b px-4 py-3 text-end font-semibold">{t('models')}</th>
              <th className="border-b px-4 py-3 text-end font-semibold">{t('vehicles')}</th>
              <th className="border-b px-4 py-3 text-end font-semibold">{t('popular')}</th>
            </tr>
          </thead>
          <tbody>
            {brands.map((brand) => (
              <tr key={brand.id}>
                <td className="border-b px-4 py-2.5 font-medium">{brand.name}</td>
                <td className="text-muted-foreground border-b px-4 py-2.5 text-end">
                  {formatNumber(brand._count.models, locale as Locale)}
                </td>
                <td className="text-muted-foreground border-b px-4 py-2.5 text-end">
                  {formatNumber(brand._count.vehicles, locale as Locale)}
                </td>
                <td className="border-b px-4 py-1.5 text-end">
                  <BrandPopularToggle brandId={brand.id} popular={brand.popular} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
