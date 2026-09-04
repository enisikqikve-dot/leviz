'use client';

import { BadgeCheck, Loader2, Star } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { submitReviewAction } from '@/features/dealers/actions';
import { formatDate } from '@/features/vehicles/format';
import { useRouter } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import { cn } from '@/lib/utils';

type Review = {
  id: string;
  rating: number;
  body: string | null;
  verified: boolean;
  createdAt: Date;
  author: { name: string | null; image: string | null };
};

const STARS = [1, 2, 3, 4, 5];

export function DealerReviews({
  dealerId, reviews, locale, canReview, alreadyReviewed,
}: {
  dealerId: string;
  reviews: Review[];
  locale: Locale;
  canReview: boolean;
  alreadyReviewed: boolean;
}) {
  const t = useTranslations('dealerProfile');
  const td = useTranslations('dealers');
  const router = useRouter();

  const [rating, setRating] = useState(0);
  const [body, setBody] = useState('');
  const [isPending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result = await submitReviewAction({ dealerId, rating, body });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      setRating(0);
      setBody('');
      toast.success(t('reviewSaved'));
      router.refresh();
    });
  }

  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold">{t('reviews')}</h2>

      {canReview && !alreadyReviewed ? (
        <div className="bg-card mt-4 rounded-xl border p-5">
          <h3 className="text-sm font-semibold">{t('writeReview')}</h3>

          <div className="mt-3 flex items-center gap-1" role="radiogroup" aria-label={t('rating')}>
            {STARS.map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={rating === value}
                aria-label={`${value}`}
                onClick={() => setRating(value)}
                className="p-1"
              >
                <Star
                  className={cn(
                    'size-6 transition-colors',
                    value <= rating ? 'text-featured fill-current' : 'text-muted-foreground',
                  )}
                  aria-hidden
                />
              </button>
            ))}
          </div>

          <textarea
            rows={3}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={2000}
            placeholder={t('reviewPlaceholder')}
            className="border-input bg-background focus-visible:ring-ring mt-3 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
          />

          <Button
            className="mt-3 h-11"
            onClick={submit}
            disabled={isPending || rating === 0}
          >
            {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            {t('submitReview')}
          </Button>
        </div>
      ) : null}

      {reviews.length === 0 ? (
        <p className="text-muted-foreground mt-4 text-sm">{td('noReviews')}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {reviews.map((review) => (
            <li key={review.id} className="bg-card rounded-xl border p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{review.author.name ?? '—'}</span>
                {review.verified ? (
                  <span className="text-primary inline-flex items-center gap-1 text-xs">
                    <BadgeCheck className="size-3.5" aria-hidden />
                    {t('verifiedBuyer')}
                  </span>
                ) : null}
                <span className="text-muted-foreground ms-auto text-xs">
                  {formatDate(review.createdAt, locale)}
                </span>
              </div>

              <div className="mt-1.5 flex" aria-label={`${review.rating}/5`}>
                {STARS.map((value) => (
                  <Star
                    key={value}
                    className={cn(
                      'size-4',
                      value <= review.rating
                        ? 'text-featured fill-current'
                        : 'text-muted-foreground/40',
                    )}
                    aria-hidden
                  />
                ))}
              </div>

              {review.body ? (
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{review.body}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
