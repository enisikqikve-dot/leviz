import type { DayPoint } from '@/features/dealers/dashboard-queries';
import type { Locale } from '@/lib/i18n/routing';

/**
 * Balkendiagramm der Aufrufe als reines SVG.
 *
 * Bewusst ohne Diagrammbibliothek: eine einzelne Zeitreihe rechtfertigt keine
 * zusaetzliche Abhaengigkeit, und so folgen die Farben ohne Umweg den
 * Design-Tokens — auch im Dunkelmodus.
 */
export function ViewsChart({
  points,
  locale,
  label,
}: {
  points: DayPoint[];
  locale: Locale;
  label: string;
}) {
  const max = Math.max(1, ...points.map((point) => point.views));
  const width = 100;
  const height = 32;
  const gap = 0.6;
  const barWidth = width / points.length - gap;

  const formatter = new Intl.DateTimeFormat(locale === 'sq' ? 'sq-AL' : locale, {
    day: '2-digit',
    month: '2-digit',
  });

  const total = points.reduce((sum, point) => sum + point.views, 0);
  const first = points[0];
  const last = points[points.length - 1];

  return (
    <figure className="bg-card rounded-xl border p-5">
      <figcaption className="flex items-baseline justify-between gap-4">
        <h2 className="text-sm font-semibold">{label}</h2>
        <p className="text-2xl font-semibold tracking-tight">{total}</p>
      </figcaption>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`${label}: ${total}`}
        className="mt-4 h-28 w-full"
      >
        {points.map((point, index) => {
          const barHeight = (point.views / max) * height;
          return (
            <rect
              key={point.date}
              x={index * (barWidth + gap)}
              y={height - barHeight}
              width={barWidth}
              height={barHeight}
              rx={0.4}
              className="fill-primary/70"
            >
              <title>{`${formatter.format(new Date(point.date))}: ${point.views}`}</title>
            </rect>
          );
        })}
      </svg>

      <div className="text-muted-foreground mt-2 flex justify-between text-xs">
        <span>{first ? formatter.format(new Date(first.date)) : null}</span>
        <span>{last ? formatter.format(new Date(last.date)) : null}</span>
      </div>
    </figure>
  );
}
