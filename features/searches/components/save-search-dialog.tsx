'use client';

import { BookmarkPlus, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { saveSearchAction } from '@/features/searches/actions';
import { useRouter } from '@/lib/i18n/navigation';

export function SaveSearchDialog({
  query,
  suggestedName,
  disabled,
}: {
  query: Record<string, string>;
  /** Vorschlag aus den gesetzten Filtern, etwa "BMW · Diesel · bis 15.000 €". */
  suggestedName: string;
  disabled: boolean;
}) {
  const t = useTranslations('searches');
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState(suggestedName);
  const [notify, setNotify] = useState(true);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const result = await saveSearchAction({ name, query, notifyByEmail: notify });
    setSaving(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    setOpen(false);
    toast.success(t('saved'));
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        // Beim Öffnen den Vorschlag aus den aktuellen Filtern übernehmen.
        if (next) setName(suggestedName);
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="h-10"
          disabled={disabled}
          title={disabled ? t('noFilters') : undefined}
        >
          <BookmarkPlus className="size-4" aria-hidden />
          {t('save')}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('saveTitle')}</DialogTitle>
          <DialogDescription>{t('saveHint')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="search-name">{t('name')}</Label>
            <Input
              id="search-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t('namePlaceholder')}
              className="h-11"
              maxLength={80}
            />
          </div>

          <label className="hover:bg-muted flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors">
            <input
              type="checkbox"
              className="accent-primary size-4 shrink-0"
              checked={notify}
              onChange={(event) => setNotify(event.target.checked)}
            />
            <span>{t('notifyByEmail')}</span>
          </label>

          <Button
            size="lg"
            className="h-11 w-full"
            onClick={save}
            disabled={saving || name.trim().length < 2}
          >
            {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            {t('save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
