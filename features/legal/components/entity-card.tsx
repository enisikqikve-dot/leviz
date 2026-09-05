import { AlertTriangle } from 'lucide-react';

import { legalEntity, missingLegalFields, type LegalEntity } from '@/lib/legal';

type Labels = {
  name: string;
  legalForm: string;
  address: string;
  registrationNumber: string;
  taxNumber: string;
  vatNumber: string;
  representative: string;
  email: string;
  phone: string;
};

/**
 * Die Angaben zum Betreiber.
 *
 * Fehlende Felder werden ausgelassen und der Mangel ausdrücklich benannt.
 * Ein Impressum mit Platzhaltern wie „Musterstraße 1" wäre schlimmer als
 * gar keins: es sieht vollständig aus und ist trotzdem falsch.
 */
export function EntityCard({
  labels,
  warning,
  entity = legalEntity,
}: {
  labels: Labels;
  warning: string;
  entity?: LegalEntity;
}) {
  const missing = missingLegalFields(entity);

  const address = [
    entity.street,
    [entity.postalCode, entity.city].filter(Boolean).join(' '),
    entity.country,
  ]
    .filter((line) => line.trim() !== '')
    .join(', ');

  const allRows: [string, string][] = [
    [labels.name, entity.name],
    // Eigene Zeile statt an den Namen gehängt: „Leviz Biznes individual"
    // liest sich wie ein Firmenname, ist aber Name plus Rechtsform.
    [labels.legalForm, entity.legalForm],
    [labels.address, address],
    [labels.representative, entity.representative],
    [labels.registrationNumber, entity.registrationNumber],
    [labels.taxNumber, entity.taxNumber],
    [labels.vatNumber, entity.vatNumber],
    [labels.email, entity.email],
    [labels.phone, entity.phone],
  ];

  const rows = allRows.filter(([, value]) => value.trim() !== '');

  return (
    <div className="space-y-4">
      {missing.length > 0 ? (
        <p
          role="alert"
          className="border-warning/40 bg-warning/10 text-warning-foreground dark:text-warning flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            {warning}
            <span className="mt-1 block font-mono text-xs opacity-80">
              {missing.join(', ')}
            </span>
          </span>
        </p>
      ) : null}

      {rows.length > 0 ? (
        <dl className="bg-card text-card-foreground divide-y rounded-xl border">
          {rows.map(([label, value]) => (
            <div key={label} className="flex flex-wrap gap-x-4 gap-y-1 px-4 py-3 text-sm">
              <dt className="text-muted-foreground w-48 shrink-0">{label}</dt>
              <dd className="font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}
