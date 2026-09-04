'use client';

import { Loader2, MessageSquare } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { startConversationAction } from '@/features/messages/actions';
import { useRouter } from '@/lib/i18n/navigation';

/**
 * Kontaktaufnahme für angemeldete Nutzer. Sie landet im internen
 * Nachrichtenaustausch statt in einer E-Mail — beide Seiten behalten den
 * Verlauf und den Fahrzeugbezug.
 */
export function ContactSellerDialog({ vehicleId }: { vehicleId: string }) {
  const t = useTranslations('vehicleDetail');
  const tm = useTranslations('messages');
  const ti = useTranslations('inquiry');
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  async function send() {
    setSending(true);
    const result = await startConversationAction({ vehicleId, body: body.trim() });
    setSending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    setOpen(false);
    setBody('');
    router.push({
      pathname: '/messages/[id]',
      params: { id: result.data.conversationId },
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="h-11 w-full">
          <MessageSquare className="size-4" aria-hidden />
          {t('contactSeller')}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('contactSeller')}</DialogTitle>
          <DialogDescription>{ti('subtitle')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <textarea
            rows={5}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={4000}
            placeholder={ti('messagePlaceholder')}
            aria-label={tm('placeholder')}
            className="border-input bg-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
          />

          <Button
            size="lg"
            className="h-11 w-full"
            onClick={send}
            disabled={sending || body.trim().length < 10}
          >
            {sending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            {tm('send')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
