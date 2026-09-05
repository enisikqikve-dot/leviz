import type { MonthBucket } from '@/features/admin/revenue';
import type { Locale } from '@/lib/i18n/routing';

/**
 * Einnahmen je Monat als reines SVG — dieselbe Bauart wie das Diagramm im
 * Händler-Dashboard. Eine einzelne Zeitreihe rechtfertigt keine
 * Diagrammbibliothek, und so folgen die Farben ohne Umweg den Design-Tokens.
 *
 * Der laufende Monat ist abgesetzt: er ist noch nicht vorbei und darf nicht
 * wie ein abgeschlossener Wert gelesen werden.
 */
export function RevenueChart({
  months,
  locale,
  label,
  format,
}: {
  months: MonthBucket[];
  locale: Locale;
  label: string;
  format: (cents: number) => string;
}) {
  const max = Math.max(1, ...months.map((month) => month.cents));
  const width = 100;
  const height = 32;
  const gap = 0.8;
  const barWidth = width / months.length - gap;

  const formatter = new Intl.DateTimeFormat(locale === 'sq' ? 'sq-AL' : locale, {
    month: 'short',
  });

  const monthLabel = (key: string) => {
    const [year, month] = key.split('-').map(Number);
    return formatter.format(new Date(Date.UTC(year, month - 1, 1)));
  };

  const first = months[0];
  const last = months[months.length - 1];

  return (
    <figure className="bg-card rounded-xl border p-5">
      <figcaption className="text-sm font-semibold">{label}</figcaption>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={label}
        className="mt-4 h-28 w-full"
      >
        {months.map((month, index) => {
          const barHeight = (month.cents / max) * height;
          const isCurrent = index === months.length - 1;

          return (
            <rect
              key={month.month}
              x={index * (barWidth + gap)}
              // Ein Monat ohne Einnahmen bekommt einen Stummel, damit die
              // Null sichtbar ist statt zu fehlen.
              y={height - Math.max(barHeight, 0.4)}
              width={barWidth}
              height={Math.max(barHeight, 0.4)}
              rx={0.4}
              className={isCurrent ? 'fill-primary' : 'fill-primary/45'}
            >
              <title>{`${monthLabel(month.month)}: ${format(month.cents)} (${month.count})`}</title>
            </rect>
          );
        })}
      </svg>

      <div className="text-muted-foreground mt-2 flex justify-between text-xs">
        <span>{first ? monthLabel(first.month) : null}</span>
        <span>{last ? monthLabel(last.month) : null}</span>
      </div>
    </figure>
  );
}
