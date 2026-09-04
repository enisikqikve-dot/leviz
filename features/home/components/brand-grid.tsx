import { getTranslations } from 'next-intl/server';

import { Link } from '@/lib/i18n/navigation';

/** Beliebte Marken mit der tatsächlichen Zahl aktiver Inserate. */
export async function BrandGrid({
  brands,
}: {
  brands: { id: string; name: string; slug: string; count: number }[];
}) {
  if (brands.length === 0) return null;

  const t = await getTranslations('home.brands');

  return (
    <section className="bg-surface border-y">
      <div className="lv-container py-12 sm:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('title')}</h2>
            <p className="text-muted-foreground mt-2 text-sm">{t('subtitle')}</p>
          </div>
        </div>

        <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {brands.map((brand) => (
            <li key={brand.id}>
              <Link
                href={{ pathname: '/search', query: { make: brand.slug } }}
                className="bg-card text-card-foreground hover:border-primary/40 hover:shadow-card flex flex-col items-center justify-center rounded-xl border px-3 py-5 text-center transition-all"
              >
                <span className="truncate text-sm font-semibold">{brand.name}</span>
                <span className="text-muted-foreground mt-0.5 text-xs">{brand.count}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
