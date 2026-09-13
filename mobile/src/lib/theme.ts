import { useColorScheme } from 'react-native';

/**
 * Die Farben von levizz.com, als Hex.
 *
 * Die Website rechnet in OKLCH; React Native kennt das nicht. Die Werte hier
 * sind dieselben Toene aus app/globals.css, nur anders geschrieben -- und die
 * Werte, die das Markenkonzept von Anfang an festgelegt hat: Ink #0A0F1C,
 * Kobalt #2F5BFF, Bernstein #F59E0B.
 */
export type Palette = {
  ink: string; inkForeground: string; background: string; card: string; foreground: string;
  muted: string; mutedSurface: string; border: string; primary: string; primaryForeground: string;
  primarySoft: string; featured: string; featuredForeground: string; success: string; successSoft: string;
  warning: string; warningSoft: string; destructive: string;
};

export const palette: Record<'light' | 'dark', Palette> = {
  light: {
    ink: '#0A0F1C',
    inkForeground: '#FAFAFB',
    background: '#F7F8FA',
    card: '#FFFFFF',
    foreground: '#0F172A',
    muted: '#6B7280',
    mutedSurface: '#EEF0F4',
    border: '#E4E7EC',
    primary: '#2F5BFF',
    primaryForeground: '#FFFFFF',
    primarySoft: '#E9EEFF',
    featured: '#F59E0B',
    featuredForeground: '#1F1300',
    success: '#1F9D55',
    successSoft: '#E6F6EC',
    warning: '#B45309',
    warningSoft: '#FEF3E2',
    destructive: '#DC2626',
  },
  dark: {
    ink: '#080C17',
    inkForeground: '#FAFAFB',
    background: '#0B1020',
    card: '#131A2C',
    foreground: '#F3F4F6',
    muted: '#9AA3B2',
    mutedSurface: '#1B2338',
    border: '#243049',
    primary: '#6D8DFF',
    primaryForeground: '#0A0F1C',
    primarySoft: '#1A2444',
    featured: '#F5B041',
    featuredForeground: '#1F1300',
    success: '#3DBF7A',
    successSoft: '#12301F',
    warning: '#F5B041',
    warningSoft: '#3A2A0E',
    destructive: '#F26B6B',
  },
};

export function useTheme(): Palette & { scheme: 'light' | 'dark' } {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return { ...palette[scheme], scheme };
}

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export const radius = { sm: 8, md: 12, lg: 16, full: 999 } as const;
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
