'use client';

import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useTransition, type FormEvent } from 'react';

import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useRouter } from '@/lib/i18n/navigation';

/** Suche, Filter und Sortierung des Händlerverzeichnisses. */
export function DealerFilters({
  query, verifiedOnly, sort,
}: {
  query: string;
  verifiedOnly: boolean;
  sort: string;
}) {
  const t = useTranslations('dealers');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [text, setText] = useState(query);

  function push(next: Record<string, string>) {
    const params: Record<string, string> = {
      ...(text.trim() ? { q: text.trim() } : {}),
      ...(verifiedOnly ? { verified: '1' } : {}),
      ...(sort !== 'rating' ? { sort } : {}),
      ...next,
    };

    // Leere Werte gehören nicht in die Adresszeile.
    for (const [key, value] of Object.entries(params)) {
      if (!value) delete params[key];
    }

    startTransition(() => router.push({ pathname: '/dealers', query: params }));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    push({ q: text.trim() });
  }

  return (
    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
      <form onSubmit={submit} className="relative flex-1">
        <Search
          className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2"
          aria-hidden
        />
        <Input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={t('searchPlaceholder')}
          aria-label={t('search')}
          className="h-11 ps-9"
        />
      </form>

      <label className="hover:bg-muted flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors">
        <input
          type="checkbox"
          className="accent-primary size-4"
          checked={verifiedOnly}
          disabled={isPending}
          onChange={(event) => push({ verified: event.target.checked ? '1' : '' })}
        />
        {t('verifiedOnly')}
      </label>

      <Select value={sort} onValueChange={(value) => push({ sort: value })} disabled={isPending}>
        <SelectTrigger className="h-11 w-full sm:w-52">
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end">
          <SelectItem value="rating">{t('sortRating')}</SelectItem>
          <SelectItem value="vehicles">{t('sortVehicles')}</SelectItem>
          <SelectItem value="name">{t('sortName')}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
