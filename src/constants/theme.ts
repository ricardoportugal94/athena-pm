/**
 * Design tokens for the Athena PM app, taken directly from the Portugal Production
 * brand manual (memory: project_pp_brand_manual.md) — extracted from the real site
 * CSS, not invented. Reuse these instead of picking new colors/fonts ad hoc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Brand = {
  ink: '#191919',
  accent: '#E4F577',
  gray333: '#333333',
  gray595: '#595959',
  gray707: '#707070',
  bgSubtle: '#F7F7F7',
  bgSubtleAlt: '#EFF1F4',
} as const;

export const Colors = {
  light: {
    text: Brand.ink,
    textSecondary: Brand.gray595,
    caption: Brand.gray707,
    background: '#F0F0F0',
    backgroundElement: '#FFFFFF',
    backgroundSelected: Brand.bgSubtleAlt,
    accent: Brand.accent,
    accentText: Brand.ink,
  },
  dark: {
    text: '#ffffff',
    textSecondary: '#C7C7C7',
    caption: '#9A9A9A',
    background: Brand.ink,
    backgroundElement: '#242424',
    backgroundSelected: '#2E2E2E',
    accent: Brand.accent,
    accentText: Brand.ink,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

// Headings use Playfair Display (brand manual); body uses the system stack the
// site already uses (-apple-system/Segoe UI/Roboto/...).
export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'PlayfairDisplay_400Regular',
    serifBold: 'PlayfairDisplay_700Bold',
    serifBlack: 'PlayfairDisplay_900Black',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'PlayfairDisplay_400Regular',
    serifBold: 'PlayfairDisplay_700Bold',
    serifBlack: 'PlayfairDisplay_900Black',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    serifBold: 'var(--font-serif)',
    serifBlack: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

// Modular type scale (briefing-redesign-nancyoliveira.md §4) — always reference
// these, never a one-off fixed font size.
export const TypeScale = {
  xs: 14, // 0.875rem
  base: 16, // 1rem
  md: 20, // 1.25rem
  lg: 24, // 1.5rem
  xl: 32, // 2rem
  xxl: 48, // 3rem
} as const;

// Exactly three radii (briefing §4): small controls, cards, capsule buttons.
export const Radius = {
  small: 6,
  card: 16,
  pill: 999,
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

// Phase 1→3 gets progressively lighter/less saturated — same cascade the old
// athena-app used (visual reference the user asked to bring back), rebuilt on
// the real accent hue instead of the old app's approximate greens.
export const PhaseColors: Record<number, string> = {
  1: '#3F7D0A',
  2: '#7BC13F',
  3: '#C7E88A',
};

export const Shadow = {
  card: Platform.select({
    web: { boxShadow: '0 2px 10px rgba(0,0,0,0.08)' },
    default: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 2 },
  }),
} as const;
