'use client';

import { Loader2, TicketPercent, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  startFeatureCheckoutAction,
  startPackageCheckoutAction,
} from '@/features/packages/actions';
import { goToCheckout } from '@/features/packages/redirect';
import { previewVoucherAction, type VoucherPreview } from '@/features/vouchers/actions';
import { formatPrice, type Currency } from '@/lib/currency';
import { Link, useRouter } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import { cn } from '@/lib/utils';

/**
 * Startet eine Zahlung und schickt den Browser zur Bezahlseite.
 *
 * Die Adresse bestimmt der Anbieter: der Mock-Anbieter fuehrt auf eine eigene
 * Seite, deren Pfad hier in die aktive Sprache uebersetzt wird; ein echter
 * Anbieter liefert eine fremde Adresse, zu der unmittelbar gewechselt wird.
 *
 * Deckt ein Gutschein den vollen Preis, faellt der Weg zum Anbieter weg — das
 * Paket ist dann schon gewaehrt, und es geht direkt zur Uebersicht.
 *
 * Mit `vehicleId` wird eine Hervorhebung gebucht, ohne sie ein Paket.
 */
export function BuyButton({
  label,
  packageId,
  vehicleId,
  locale,
  currency,
  eurToAll,
  variant = 'default',
  className,
  disabled,
}: {
  label: string;
  packageId: string;
  vehicleId?: string;
  locale: Locale;
  currency: Currency;
  eurToAll: number;
  variant?: 'default' | 'outline';
  className?: string;
  disabled?: boolean;
}) {
  const t = useTranslations('vouchers');
  const tc = useTranslations('checkout');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [feldOffen, setFeldOffen] = useState(false);
  const [code, setCode] = useState('');
  const [preview, setPreview] = useState<VoucherPreview | null>(null);
  const [pruefend, setPruefend] = useState(false);
  const [zugestimmt, setZugestimmt] = useState(false);

  const preis = (cents: number) => formatPrice(cents, { currency, locale, eurToAll });
  const meldung = (schluessel: string) =>
    t.has(schluessel) ? t(schluessel) : tc.has(schluessel) ? tc(schluessel) : schluessel;

  async function pruefe() {
    if (!code.trim()) return;

    setPruefend(true);
    try {
      const result = await previewVoucherAction({ code, packageId });

      if (!result.ok) {
        setPreview(null);
        toast.error(meldung(result.error));
        return;
      }

      setPreview(result.data);
      toast.success(t('applied'));
    } finally {
      setPruefend(false);
    }
  }

  return (
    <div className={cn('space-y-2', className)}>
      {/*
        Die Zustimmung zur sofortigen Ausfuehrung.

        Die Leistung beginnt mit der Zahlung -- das Paket laeuft, die
        Hervorhebung ist sichtbar. Das Widerrufsrecht erlischt dabei nur, wenn
        der Kaeufer dem vorher ausdruecklich zugestimmt hat. Ohne das Haekchen
        koennte er vierzehn Tage lang zurueckgeben, was laengst erbracht ist.

        Der Verweis auf die Widerrufsseite steht daneben, damit niemand einem
        Verzicht zustimmt, den er nicht nachlesen kann. Der Knopf bleibt bis
        dahin gesperrt -- und der Server prueft es unabhaengig davon noch
        einmal.
      */}
      <label className="flex cursor-pointer items-start gap-2.5 text-start">
        <input
          type="checkbox"
          checked={zugestimmt}
          onChange={(event) => setZugestimmt(event.target.checked)}
          className="accent-primary mt-0.5 size-4 shrink-0"
        />
        <span className="text-muted-foreground text-xs leading-snug">
          {tc('consent')}{' '}
          <Link
            href="/withdrawal"
            target="_blank"
            className="text-primary underline underline-offset-2"
          >
            {tc('consentLink')}
          </Link>
        </span>
      </label>

      <Button
        type="button"
        variant={variant}
        disabled={disabled || isPending || !zugestimmt}
        className="w-full"
        onClick={() =>
          startTransition(async () => {
            // Gerechnet wird auf dem Server erneut. Der geprüfte Code hier ist
            // nur die Anzeige; den Preis bestimmt nie der Browser.
            const angewandt = preview?.code ?? null;

            const result = vehicleId
              ? await startFeatureCheckoutAction(vehicleId, packageId, angewandt, zugestimmt)
              : await startPackageCheckoutAction(packageId, angewandt, zugestimmt);

            if (!result.ok) {
              toast.error(meldung(result.error));
              return;
            }

            if (result.data.kind === 'granted') {
              toast.success(t('granted'));
              router.push('/dashboard/billing');
              router.refresh();
              return;
            }

            if (result.data.kind === 'external') {
              goToCheckout(result.data);
              return;
            }

            router.push({
              pathname: '/checkout/[id]',
              params: { id: result.data.paymentId },
            });
          })
        }
      >
        {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        {preview?.free ? t('activateFree') : label}
      </Button>

      {preview ? (
        <div className="bg-success/10 text-success flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs font-medium">
          <span className="truncate">
            {preview.code} · −{preis(preview.discountCents)}
          </span>
          <span className="flex items-center gap-2">
            <span className="tabular-nums">
              {preview.free ? t('freeNow') : preis(preview.finalCents)}
            </span>
            <button
              type="button"
              aria-label={t('remove')}
              onClick={() => {
                setPreview(null);
                setCode('');
              }}
              className="hover:opacity-70"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </span>
        </div>
      ) : feldOffen ? (
        <div className="flex gap-2">
          <Input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void pruefe();
              }
            }}
            placeholder={t('placeholder')}
            aria-label={t('label')}
            className="h-9 flex-1 text-sm uppercase"
          />
          <Button type="button" variant="outline" size="sm" onClick={pruefe} disabled={pruefend}>
            {pruefend ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
            {t('apply')}
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setFeldOffen(true)}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs"
        >
          <TicketPercent className="size-3.5" aria-hidden />
          {t('haveCode')}
        </button>
      )}
    </div>
  );
}
