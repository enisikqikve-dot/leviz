'use client';

import { Loader2, Sparkles, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { interpretSearchAction, type InterpretedSearch } from '@/features/ai/actions';
import { useRouter } from '@/lib/i18n/navigation';

/**
 * Freitextsuche.
 *
 * Der gelesene Text wird nicht sofort ausgeführt, sondern erst gezeigt: was
 * verstanden wurde und was nicht. Eine still gesetzte Preisgrenze, die der
 * Nutzer nie gemeint hat, wäre schlimmer als eine Rückfrage.
 */
export function SearchAssistant() {
  const t = useTranslations('assistant');
  const router = useRouter();

  const [text, setText] = useState('');
  const [result, setResult] = useState<InterpretedSearch | null>(null);
  const [isPending, startTransition] = useTransition();

  const interpret = () =>
    startTransition(async () => {
      const response = await interpretSearchAction({ text });
      setResult(response.ok ? response.data : null);
    });

  const apply = () => {
    if (!result) return;
    startTransition(() => {
      router.push({ pathname: '/search', query: result.query });
    });
  };

  const hasFilters = result !== null && Object.keys(result.query).length > 0;

  return (
    <section className="bg-card text-card-foreground rounded-xl border p-4">
      <h2 className="inline-flex items-center gap-2 text-sm font-semibold">
        <Sparkles className="text-primary size-4" aria-hidden />
        {t('title')}
      </h2>

      <form
        className="mt-3 flex flex-wrap gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          interpret();
        }}
      >
        <Input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={t('placeholder')}
          aria-label={t('title')}
          maxLength={200}
          className="h-11 min-w-0 flex-1"
        />
        <Button type="submit" className="h-11" disabled={isPending || text.trim().length < 2}>
          {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {t('submit')}
        </Button>
      </form>

      {result === null ? null : (
        <div className="mt-4 space-y-3 border-t pt-4">
          {hasFilters ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-muted-foreground text-xs">{t('understood')}:</span>
                {result.matched.map((entry) => (
                  <span
                    key={entry}
                    className="bg-success/10 text-success rounded-full px-2 py-0.5 text-xs font-medium"
                  >
                    {entry}
                  </span>
                ))}
              </div>

              {result.ignored.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground text-xs">{t('ignored')}:</span>
                  {result.ignored.map((entry) => (
                    <span
                      key={entry}
                      className="bg-muted text-muted-foreground inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
                    >
                      <X className="size-3" aria-hidden />
                      {entry}
                    </span>
                  ))}
                </div>
              ) : null}

              <Button type="button" size="sm" onClick={apply}>
                {t('apply')}
              </Button>
            </>
          ) : (
            <p className="text-muted-foreground text-sm">{t('nothing')}</p>
          )}
        </div>
      )}
    </section>
  );
}
