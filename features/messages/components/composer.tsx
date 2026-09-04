'use client';

import { Loader2, Send } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { sendMessageAction } from '@/features/messages/actions';
import { useRouter } from '@/lib/i18n/navigation';

export function MessageComposer({
  conversationId,
  disabled,
}: {
  conversationId: string;
  disabled?: boolean;
}) {
  const t = useTranslations('messages');
  const router = useRouter();
  const [body, setBody] = useState('');
  const [isPending, startTransition] = useTransition();
  const areaRef = useRef<HTMLTextAreaElement>(null);

  function submit() {
    const text = body.trim();
    if (!text) return;

    startTransition(async () => {
      const result = await sendMessageAction({ conversationId, body: text });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      setBody('');
      router.refresh();
      areaRef.current?.focus();
    });
  }

  return (
    <form
      className="bg-card flex items-end gap-2 border-t p-3"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <textarea
        ref={areaRef}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        onKeyDown={(event) => {
          // Enter sendet, Umschalt+Enter macht einen Absatz — wie in
          // gängigen Nachrichtendiensten.
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            submit();
          }
        }}
        rows={2}
        maxLength={4000}
        disabled={disabled || isPending}
        placeholder={t('placeholder')}
        aria-label={t('placeholder')}
        className="border-input bg-background focus-visible:ring-ring max-h-40 min-h-11 flex-1 resize-y rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
      />
      <Button
        type="submit"
        size="icon"
        className="size-11 shrink-0"
        aria-label={t('send')}
        disabled={disabled || isPending || body.trim().length === 0}
      >
        {isPending
          ? <Loader2 className="size-4 animate-spin" aria-hidden />
          : <Send className="size-4" aria-hidden />}
      </Button>
    </form>
  );
}
