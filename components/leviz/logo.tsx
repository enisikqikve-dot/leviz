import { cn } from '@/lib/utils';

/**
 * LEVIZ Wortmarke.
 *
 * Handgezeichnete geometrische Buchstabenformen auf einem 72-Einheiten-Raster,
 * damit das Logo unabhängig von geladenen Schriften immer identisch aussieht.
 * Das V ist als Chevron überzeichnet und trägt den Markenakzent — dieselbe Form
 * dient in `LevizIcon` als eigenständiges Zeichen.
 */

const GLYPHS = {
  // Stammbreite 14, Versalhöhe 72.
  L: { width: 52, d: 'M0 0 H14 V58 H52 V72 H0 Z' },
  E: { width: 50, d: 'M0 0 H50 V14 H14 V29 H44 V43 H14 V58 H50 V72 H0 Z' },
  V: { width: 56, d: 'M0 0 H16 L28 46 L40 0 H56 L34 72 H22 Z' },
  I: { width: 14, d: 'M0 0 H14 V72 H0 Z' },
  Z: { width: 50, d: 'M0 0 H50 V14 L21 58 H50 V72 H0 V58 L29 14 H0 Z' },
} as const;

const GAP = 12;
const LETTERS = ['L', 'E', 'V', 'I', 'Z'] as const;

const positions = LETTERS.reduce<{ letter: (typeof LETTERS)[number]; x: number }[]>(
  (acc, letter) => {
    const previous = acc[acc.length - 1];
    const x = previous ? previous.x + GLYPHS[previous.letter].width + GAP : 0;
    return [...acc, { letter, x }];
  },
  [],
);

const WORDMARK_WIDTH =
  positions[positions.length - 1].x +
  GLYPHS[LETTERS[LETTERS.length - 1]].width;

type WordmarkProps = {
  className?: string;
  /** Hebt das V im Markenakzent hervor. Auf einfarbigen Flächen abschaltbar. */
  accent?: boolean;
  title?: string;
};

export function LevizWordmark({
  className,
  accent = true,
  title = 'LEVIZ',
}: WordmarkProps) {
  return (
    <svg
      viewBox={`0 0 ${WORDMARK_WIDTH} 72`}
      role="img"
      aria-label={title}
      className={cn('h-6 w-auto', className)}
      fill="currentColor"
    >
      {positions.map(({ letter, x }) => (
        <path
          key={letter}
          d={GLYPHS[letter].d}
          transform={`translate(${x} 0)`}
          className={
            accent && letter === 'V' ? 'text-primary fill-current' : undefined
          }
        />
      ))}
    </svg>
  );
}

type IconProps = {
  className?: string;
  /** Ohne Hintergrundplatte, etwa für einfarbige Kontexte. */
  bare?: boolean;
  title?: string;
};

/**
 * Eigenständiges LEVIZ-Zeichen: der Chevron aus dem V in einer weichen Platte.
 * Funktioniert als Favicon, App-Icon und in der mobilen Kopfzeile.
 */
export function LevizIcon({ className, bare = false, title = 'LEVIZ' }: IconProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      role="img"
      aria-label={title}
      className={cn('h-8 w-8', className)}
    >
      {!bare && <rect width="48" height="48" rx="12" className="fill-primary" />}
      <path
        // Chevron aus GLYPHS.V, zentriert und auf 48 skaliert.
        d={GLYPHS.V.d}
        transform="translate(10 12) scale(0.5)"
        className={bare ? 'fill-current' : 'fill-primary-foreground'}
      />
      <path
        // Zweiter, schmalerer Chevron als Bewegungsspur — "lëviz".
        d={GLYPHS.V.d}
        transform="translate(10 4) scale(0.5)"
        className={bare ? 'fill-current' : 'fill-primary-foreground'}
        opacity="0.35"
      />
    </svg>
  );
}

/** Zeichen und Wortmarke nebeneinander, wie in der Kopfzeile verwendet. */
export function LevizLogo({
  className,
  wordmarkClassName,
  accent = true,
}: {
  className?: string;
  wordmarkClassName?: string;
  accent?: boolean;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LevizIcon className="h-8 w-8 shrink-0" />
      <LevizWordmark className={cn('h-[18px]', wordmarkClassName)} accent={accent} />
    </span>
  );
}
