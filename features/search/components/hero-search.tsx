'use client';

import { ArrowRight, MapPin, Search, SlidersHorizontal } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatNumber } from '@/lib/currency';
import { Link } from '@/lib/i18n/navigation';
import { useRouter } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import { cn } from '@/lib/utils';

const CONDITIONS = ['any', 'new', 'used'] as const;
type Condition = (typeof CONDITIONS)[number];

const PRICE_STEPS = [2500, 5000, 7500, 10000, 15000, 20000, 30000, 50000, 75000, 100000];
const RADIUS_STEPS = [10, 25, 50, 100, 200];

const ANY = '__any__';

export function HeroSearch() {
  const t = useTranslations('home.hero');
  const locale = useLocale() as Locale;
  const router = useRouter();

  const [condition, setCondition] = useState<Condition>('any');
  const [query, setQuery] = useState('');
  const [priceMax, setPriceMax] = useState(ANY);
  const [location, setLocation] = useState('');
  const [radius, setRadius] = useState(ANY);

  function submit(event: FormEvent) {
    event.preventDefault();

    // Alle Filter landen als URL-Parameter, damit jede Suche teilbar bleibt.
    const query_: Record<string, string> = {};
    if (query.trim()) query_.q = query.trim();
    if (condition !== 'any') query_.condition = condition;
    if (priceMax !== ANY) query_.priceMax = priceMax;
    if (location.trim()) query_.location = location.trim();
    if (radius !== ANY) query_.radius = radius;

    router.push({ pathname: '/search', query: query_ });
  }

  return (
    <form
      onSubmit={submit}
      className="bg-card text-card-foreground shadow-panel rounded-2xl border p-4 sm:p-5"
    >
      <fieldset className="mb-4">
        <legend className="sr-only">{t('condition')}</legend>
        <div
          role="radiogroup"
          aria-label={t('condition')}
          className="bg-muted inline-flex rounded-lg p-1"
        >
          {CONDITIONS.map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={condition === value}
              onClick={() => setCondition(value)}
              className={cn(
                'rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
                condition === value
                  ? 'bg-card text-foreground shadow-card'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t(
                value === 'any'
                  ? 'conditionAny'
                  : value === 'new'
                    ? 'conditionNew'
                    : 'conditionUsed',
              )}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-3 md:grid-cols-12">
        <div className="md:col-span-5">
          <Label htmlFor="hero-q" className="text-muted-foreground mb-1.5 text-xs">
            {t('make')} · {t('model')}
          </Label>
          <div className="relative">
            <Search
              className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2"
              aria-hidden
            />
            <Input
              id="hero-q"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="BMW 320d, Golf 8, Passat…"
              className="h-11 ps-9"
              autoComplete="off"
            />
          </div>
        </div>

        <div className="md:col-span-3">
          <Label htmlFor="hero-price" className="text-muted-foreground mb-1.5 text-xs">
            {t('priceMax')}
          </Label>
          <Select value={priceMax} onValueChange={setPriceMax}>
            <SelectTrigger id="hero-price" className="h-11 w-full">
              <SelectValue placeholder={t('priceAny')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>{t('priceAny')}</SelectItem>
              {PRICE_STEPS.map((step) => (
                <SelectItem key={step} value={String(step)}>
                  {formatNumber(step, locale)} €
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="hero-location" className="text-muted-foreground mb-1.5 text-xs">
            {t('location')}
          </Label>
          <div className="relative">
            <MapPin
              className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2"
              aria-hidden
            />
            <Input
              id="hero-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Prishtinë"
              className="h-11 ps-9"
              autoComplete="off"
            />
          </div>
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="hero-radius" className="text-muted-foreground mb-1.5 text-xs">
            {t('radius')}
          </Label>
          <Select value={radius} onValueChange={setRadius}>
            <SelectTrigger id="hero-radius" className="h-11 w-full">
              <SelectValue placeholder={t('locationAny')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>{t('locationAny')}</SelectItem>
              {RADIUS_STEPS.map((km) => (
                <SelectItem key={km} value={String(km)}>
                  {km} km
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-4 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/search"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
        >
          <SlidersHorizontal className="size-4" aria-hidden />
          {t('advanced')}
        </Link>
        <Button type="submit" size="lg" className="h-11 sm:min-w-52">
          {t('submit')}
          <ArrowRight className="size-4" aria-hidden />
        </Button>
      </div>
    </form>
  );
}
