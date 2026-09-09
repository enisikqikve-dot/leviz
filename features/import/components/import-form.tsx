'use client';

import {
  AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Loader2, Upload,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { analyseImportAction, runImportAction } from '@/features/import/actions';
import {
  MAX_IMPORT_ROWS,
  type ImportAnalysis, type ImportProblem, type ImportRunResult,
} from '@/features/import/report';
import { Link } from '@/lib/i18n/navigation';
import { cn } from '@/lib/utils';

/**
 * Drei Schritte: Datei waehlen, Vorschau lesen, importieren.
 *
 * Der mittlere Schritt ist der Grund fuer das Ganze. Vierzig Inserate aus einer
 * Datei anzulegen, die niemand vorher gesehen hat, geht genau einmal gut -- und
 * danach loescht der Haendler vierzig Inserate von Hand.
 *
 * Die Datei wird im Browser gelesen und als Text an den Server geschickt. Der
 * prueft sie beim Import noch einmal von vorne; was hier in der Vorschau steht,
 * ist Anzeige und keine Grundlage.
 */
export function ImportForm() {
  const t = useTranslations('import');

  const dateiFeld = useRef<HTMLInputElement>(null);
  const [csv, setCsv] = useState<string | null>(null);
  const [dateiname, setDateiname] = useState('');
  const [analyse, setAnalyse] = useState<ImportAnalysis | null>(null);
  const [ergebnis, setErgebnis] = useState<ImportRunResult | null>(null);
  const [beschreibung, setBeschreibung] = useState(true);
  const [sofortLive, setSofortLive] = useState(false);
  const [laeuft, starte] = useTransition();

  function zuruecksetzen() {
    setCsv(null);
    setDateiname('');
    setAnalyse(null);
    setErgebnis(null);
    if (dateiFeld.current) dateiFeld.current.value = '';
  }

  async function dateiGewaehlt(event: React.ChangeEvent<HTMLInputElement>) {
    const datei = event.target.files?.[0];
    if (!datei) return;

    try {
      const text = await datei.text();
      setCsv(text);
      setDateiname(datei.name);
      setAnalyse(null);
      setErgebnis(null);
    } catch {
      toast.error(t('errorRead'));
    }
  }

  function pruefen() {
    if (!csv) return;

    starte(async () => {
      const antwort = await analyseImportAction(csv, beschreibung);
      if (!antwort.ok) {
        toast.error(antwort.error);
        return;
      }
      setAnalyse(antwort.data);
    });
  }

  function importieren() {
    if (!csv) return;

    starte(async () => {
      const antwort = await runImportAction(csv, beschreibung, sofortLive);
      if (!antwort.ok) {
        toast.error(antwort.error);
        return;
      }
      setErgebnis(antwort.data);
    });
  }

  if (ergebnis) return <Ergebnis ergebnis={ergebnis} onNeu={zuruecksetzen} />;

  const anlegbar = analyse
    ? analyse.freeSlots === null
      ? analyse.readyCount
      : Math.min(analyse.readyCount, analyse.freeSlots)
    : 0;

  return (
    <div className="space-y-6">
      {/* Schritt 1 */}
      <section className="bg-card rounded-xl border p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold">{t('pickFile')}</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {t('fileHint', { max: MAX_IMPORT_ROWS })}
            </p>
          </div>
          <Button asChild variant="outline" className="h-10">
            <a href="/api/import/template" download>
              <Download className="size-4" aria-hidden />
              {t('template')}
            </a>
          </Button>
        </div>

        <input
          ref={dateiFeld}
          type="file"
          accept=".csv,text/csv,text/plain"
          onChange={dateiGewaehlt}
          className="file:bg-muted file:text-foreground hover:file:bg-border mt-4 block w-full cursor-pointer rounded-lg border text-sm file:mr-4 file:cursor-pointer file:rounded-s-lg file:border-0 file:px-4 file:py-2.5 file:text-sm file:font-medium"
        />

        {dateiname ? (
          <p className="text-muted-foreground mt-2 inline-flex items-center gap-1.5 text-sm">
            <FileSpreadsheet className="size-4" aria-hidden />
            {dateiname}
          </p>
        ) : null}

        <div className="mt-4 space-y-3 border-t pt-4">
          <Schalter
            checked={beschreibung}
            onChange={setBeschreibung}
            label={t('generateDescription')}
            hint={t('generateDescriptionHint')}
          />
          <Schalter
            checked={sofortLive}
            onChange={setSofortLive}
            label={t('publishNow')}
            hint={t('publishNowHint')}
          />
        </div>

        <Button
          onClick={pruefen}
          disabled={!csv || laeuft}
          size="lg"
          className="mt-4 h-11 w-full sm:w-auto"
        >
          {laeuft && !analyse ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Upload className="size-4" aria-hidden />
          )}
          {laeuft && !analyse ? t('analysing') : t('analyse')}
        </Button>
      </section>

      {/* Schritt 2 */}
      {analyse ? (
        <Vorschau
          analyse={analyse}
          anlegbar={anlegbar}
          laeuft={laeuft}
          onImport={importieren}
          onZurueck={zuruecksetzen}
        />
      ) : null}
    </div>
  );
}

function Schalter({
  checked, onChange, label, hint,
}: {
  checked: boolean;
  onChange: (wert: boolean) => void;
  label: string;
  hint: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="accent-primary mt-0.5 size-4 shrink-0"
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        <span className="text-muted-foreground block text-xs">{hint}</span>
      </span>
    </label>
  );
}

function Vorschau({
  analyse, anlegbar, laeuft, onImport, onZurueck,
}: {
  analyse: ImportAnalysis;
  anlegbar: number;
  laeuft: boolean;
  onImport: () => void;
  onZurueck: () => void;
}) {
  const t = useTranslations('import');

  const mitProblemen = analyse.rows.filter((row) => row.problems.length > 0);
  const ergaenzt = analyse.rows.filter((row) => row.descriptionGenerated).length;
  // Nur Felder, zu denen es ueberhaupt eine Meldung geben kann, haben eine
  // Beschriftung -- und genau die kommen aus `rows.ts` zurueck.
  const feldName = (feld: string) => t(`fields.${feld}` as never);

  return (
    <section className="bg-card rounded-xl border p-5">
      <h2 className="text-base font-semibold">{t('previewTitle')}</h2>

      {analyse.missingColumns.length > 0 ? (
        <p className="bg-warning/10 text-warning-foreground dark:text-warning mt-3 rounded-lg px-3 py-2 text-sm">
          {t('missingColumns', {
            columns: analyse.missingColumns.map(feldName).join(', '),
          })}
        </p>
      ) : null}

      {analyse.unknownColumns.length > 0 ? (
        <p className="text-muted-foreground mt-3 text-sm">
          {t('unknownColumns', { columns: analyse.unknownColumns.join(', ') })}
        </p>
      ) : null}

      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm">
        <li className="text-success inline-flex items-center gap-1.5 font-medium">
          <CheckCircle2 className="size-4" aria-hidden />
          {t('ready', { count: analyse.readyCount })}
        </li>
        {mitProblemen.length > 0 ? (
          <li className="text-warning-foreground dark:text-warning inline-flex items-center gap-1.5 font-medium">
            <AlertTriangle className="size-4" aria-hidden />
            {t('withProblems', { count: mitProblemen.length })}
          </li>
        ) : null}
        {ergaenzt > 0 ? (
          <li className="text-muted-foreground">{t('generatedCount', { count: ergaenzt })}</li>
        ) : null}
        <li className="text-muted-foreground">
          {analyse.freeSlots === null
            ? t('limitUnlimited')
            : t('limitLeft', { count: analyse.freeSlots })}
        </li>
      </ul>

      {analyse.freeSlots !== null && analyse.readyCount > analyse.freeSlots ? (
        <p className="bg-warning/10 text-warning-foreground dark:text-warning mt-3 rounded-lg px-3 py-2 text-sm">
          {t('limitWarning', { count: anlegbar })}
        </p>
      ) : null}

      {mitProblemen.length > 0 ? (
        <div className="mt-5 overflow-x-auto rounded-lg border">
          <table className="w-full border-collapse text-sm">
            <tbody>
              {mitProblemen.map((row) => (
                <tr key={row.line} className="border-b last:border-0">
                  <th
                    scope="row"
                    className="text-muted-foreground w-28 px-3 py-2 text-start text-xs font-normal"
                  >
                    {t('line', { line: row.line })}
                  </th>
                  <td className="px-3 py-2 font-medium">{row.label}</td>
                  <td className="px-3 py-2">
                    <ul className="space-y-0.5">
                      {row.problems.map((problem, index) => (
                        <li key={index} className="text-warning-foreground dark:text-warning text-xs">
                          <Problemzeile problem={problem} feldName={feldName} />
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-3">
        <Button
          onClick={onImport}
          disabled={anlegbar === 0 || laeuft}
          size="lg"
          className="h-11"
        >
          {laeuft ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {laeuft ? t('running') : t('runImport', { count: anlegbar })}
        </Button>
        <Button onClick={onZurueck} variant="outline" size="lg" className="h-11" disabled={laeuft}>
          {t('back')}
        </Button>
      </div>
    </section>
  );
}

function Problemzeile({
  problem, feldName,
}: {
  problem: ImportProblem;
  feldName: (feld: string) => string;
}) {
  const t = useTranslations('import');

  return (
    <>
      <span className="font-medium">{feldName(problem.field)}</span>
      {': '}
      {t(`problems.${problem.code}` as never)}
      {problem.detail ? (
        <span className="text-muted-foreground">
          {' — '}
          {t('problems.options', { options: problem.detail })}
        </span>
      ) : null}
    </>
  );
}

function Ergebnis({
  ergebnis, onNeu,
}: {
  ergebnis: ImportRunResult;
  onNeu: () => void;
}) {
  const t = useTranslations('import');

  return (
    <section className="bg-card rounded-xl border p-5">
      <h2 className="text-base font-semibold">{t('resultTitle')}</h2>

      <ul className="mt-3 space-y-1 text-sm">
        <li className={cn('font-medium', ergebnis.created > 0 && 'text-success')}>
          {t('createdCount', { count: ergebnis.created })}
        </li>
        {ergebnis.published > 0 ? (
          <li className="text-muted-foreground">
            {t('publishedCount', { count: ergebnis.published })}
          </li>
        ) : null}
        {ergebnis.skippedForLimit > 0 ? (
          <li className="text-warning-foreground dark:text-warning">
            {t('skippedForLimit', { count: ergebnis.skippedForLimit })}
          </li>
        ) : null}
      </ul>

      {ergebnis.imageWarnings.length > 0 ? (
        <div className="mt-5">
          <h3 className="text-sm font-semibold">{t('imageWarningTitle')}</h3>
          <ul className="text-muted-foreground mt-2 space-y-1 text-xs">
            {ergebnis.imageWarnings.map((eintrag) => (
              <li key={eintrag.line}>
                {t('line', { line: eintrag.line })} · {eintrag.label} —{' '}
                {t('imageWarning', { count: eintrag.failed })}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {ergebnis.failed.length > 0 ? (
        <div className="mt-5">
          <h3 className="text-sm font-semibold">{t('failedTitle')}</h3>
          <ul className="mt-2 space-y-1 text-xs">
            {ergebnis.failed.map((eintrag) => (
              <li key={eintrag.line} className="text-warning-foreground dark:text-warning">
                {t('line', { line: eintrag.line })} · {eintrag.label} — {eintrag.reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-3">
        <Button asChild size="lg" className="h-11">
          <Link href="/dashboard/listings">{t('toListings')}</Link>
        </Button>
        <Button onClick={onNeu} variant="outline" size="lg" className="h-11">
          {t('back')}
        </Button>
      </div>
    </section>
  );
}
