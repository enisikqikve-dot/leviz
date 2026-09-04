'use client';

import { Loader2, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { generateDescriptionAction } from '@/features/ai/actions';

/** Was der Generator aus dem Formular bekommt. */
export type DescribeDraft = {
  brandSlug?: string;
  modelSlug?: string;
  variant?: string;
  registrationYear?: number;
  mileageKm?: number;
  fuel?: string;
  transmission?: string;
  powerKw?: number;
  bodyType?: string;
  doors?: number;
  seats?: number;
  color?: string;
  customsStatus?: string;
  plateOrigin?: string;
  accidentFree?: boolean;
  serviceHistory?: boolean;
  ownersCount?: number;
  features?: string[];
};

/**
 * Schlägt einen Beschreibungstext vor.
 *
 * Der Vorschlag landet im Formularfeld und ist von dort aus frei zu ändern.
 * Absichtlich kein automatisches Ausfüllen im Hintergrund: was am Ende im
 * Inserat steht, verantwortet der Verkäufer, und er soll es gelesen haben.
 */
export function DescribeButton({
  draft,
  onText,
  disabled,
}: {
  draft: () => DescribeDraft;
  onText: (text: string) => void;
  disabled?: boolean;
}) {
  const t = useTranslations('ai');
  const [isPending, startTransition] = useTransition();

  return (
    <div className="mt-2 flex flex-wrap items-center gap-3">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || isPending}
        onClick={() =>
          startTransition(async () => {
            const values = draft();

            if (!values.brandSlug || !values.modelSlug) {
              toast.error(t('needsBasics'));
              return;
            }

            const result = await generateDescriptionAction(values);

            if (!result.ok) {
              toast.error(result.error);
              return;
            }

            onText(result.data.text);
            toast.success(t('replaced'));
          })
        }
      >
        {isPending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <Sparkles className="size-4" aria-hidden />
        )}
        {isPending ? t('suggesting') : t('suggest')}
      </Button>

      <p className="text-muted-foreground text-xs">{t('suggestHint')}</p>
    </div>
  );
}
