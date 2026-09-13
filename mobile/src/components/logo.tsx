import Svg, { Path, Rect } from 'react-native-svg';

import { useTheme } from '~/lib/theme';

/**
 * Wortmarke und Zeichen -- dieselben Pfade wie in components/leviz/logo.tsx.
 *
 * Nicht nachgezeichnet, sondern uebernommen: das V ist derselbe Chevron, das
 * Zeichen dieselbe Platte. Eine App, deren Logo minimal anders aussieht als
 * die Website, wirkt wie eine Kopie von jemand anderem.
 */
const GLYPHS = {
  L: { width: 52, d: 'M0 0 H14 V58 H52 V72 H0 Z' },
  E: { width: 50, d: 'M0 0 H50 V14 H14 V29 H44 V43 H14 V58 H50 V72 H0 Z' },
  V: { width: 56, d: 'M0 0 H16 L28 46 L40 0 H56 L34 72 H22 Z' },
  I: { width: 14, d: 'M0 0 H14 V72 H0 Z' },
  Z: { width: 50, d: 'M0 0 H50 V14 L21 58 H50 V72 H0 V58 L29 14 H0 Z' },
} as const;

const GAP = 12;
const LETTERS = ['L', 'E', 'V', 'I', 'Z'] as const;

const positions = LETTERS.reduce<{ letter: (typeof LETTERS)[number]; x: number }[]>((acc, letter) => {
  const prev = acc[acc.length - 1];
  const x = prev ? prev.x + GLYPHS[prev.letter].width + GAP : 0;
  return [...acc, { letter, x }];
}, []);

const WIDTH = positions[positions.length - 1]!.x + GLYPHS.Z.width;

export function Wordmark({ height = 18, color }: { height?: number; color?: string }) {
  const theme = useTheme();
  const fill = color ?? theme.foreground;
  return (
    <Svg width={(height / 72) * WIDTH} height={height} viewBox={`0 0 ${WIDTH} 72`}>
      {positions.map(({ letter, x }) => (
        <Path key={letter} d={GLYPHS[letter].d} transform={`translate(${x} 0)`} fill={letter === 'V' ? theme.primary : fill} />
      ))}
    </Svg>
  );
}

export function Mark({ size = 32 }: { size?: number }) {
  const theme = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Rect width={48} height={48} rx={12} fill={theme.primary} />
      <Path d={GLYPHS.V.d} transform="translate(10 4) scale(0.5)" fill={theme.primaryForeground} opacity={0.35} />
      <Path d={GLYPHS.V.d} transform="translate(10 12) scale(0.5)" fill={theme.primaryForeground} />
    </Svg>
  );
}

export function Logo({ dark }: { dark?: boolean }) {
  const theme = useTheme();
  return (
    <>
      <Mark size={30} />
      <Wordmark height={17} color={dark ? theme.inkForeground : undefined} />
    </>
  );
}
