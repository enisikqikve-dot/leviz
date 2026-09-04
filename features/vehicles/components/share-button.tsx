'use client';

import { Check, Share2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';

/**
 * Nutzt die native Teilen-Funktion des Geräts, wo vorhanden — auf Mobilgeräten
 * der übliche Weg. Sonst wird der Link in die Zwischenablage kopiert.
 */
export function ShareButton({ title }: { title: string }) {
  const t = useTranslations('vehicleDetail');
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // Abbruch durch den Nutzer ist kein Fehler; unten wird kopiert.
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(t('shareCopied'));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t('shareCopied'));
    }
  }

  return (
    <Button type="button" variant="outline" size="lg" className="h-11" onClick={share}>
      {copied ? <Check className="size-4" aria-hidden /> : <Share2 className="size-4" aria-hidden />}
      {t('share')}
    </Button>
  );
}
