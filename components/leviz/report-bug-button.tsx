'use client';

import { Bug } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link, usePathname } from '@/lib/i18n/navigation';

/**
 * Fehler melden, von jeder Seite aus.
 *
 * Vorher fuehrte der Weg dorthin nur ueber die Fusszeile. Wer mitten in einer
 * langen Trefferliste etwas Kaputtes bemerkt, scrollt dafuer nicht ans Ende
 * der Seite — er meldet es gar nicht. Genau die Meldungen fehlen dann, die am
 * meisten wert sind.
 *
 * Bewusst klein und ruhig gehalten: auffindbar, ohne sich vor den Inhalt zu
 * stellen. Die Hinweise (Toasts) erscheinen oben, hier unten kommt sich also
 * nichts in die Quere.
 */
export function ReportBugButton() {
  const t = useTranslations('footer');
  const pathname = usePathname();

  // Auf der Meldeseite selbst waere der Knopf ein Verweis auf sich.
  if (pathname === '/report-bug') return null;

  return (
    <Link
      href="/report-bug"
      className="bg-card/95 text-muted-foreground hover:text-foreground fixed bottom-4 end-4 z-40 inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium shadow-lg backdrop-blur-sm transition-colors"
    >
      <Bug className="size-4 shrink-0" aria-hidden />
      {t('reportBug')}
    </Link>
  );
}
