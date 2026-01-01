// Design System - Typography Tokens
// Consistent text styles throughout the app

import { Platform, TextStyle } from 'react-native';

// Font families
export const FONT_FAMILY = {
  // System fonts for optimal performance
  regular: Platform.select({
    ios: 'System',
    android: 'Roboto',
    default: 'System',
  }),
  medium: Platform.select({
    ios: 'System',
    android: 'Roboto-Medium',
    default: 'System',
  }),
  semibold: Platform.select({
    ios: 'System',
    android: 'Roboto-Medium', // Android uses Medium for semibold
    default: 'System',
  }),
  bold: Platform.select({
    ios: 'System',
    android: 'Roboto-Bold',
    default: 'System',
  }),
} as const;

// Font weights
export const FONT_WEIGHT = {
  regular: '400' as TextStyle['fontWeight'],
  medium: '500' as TextStyle['fontWeight'],
  semibold: '600' as TextStyle['fontWeight'],
  bold: '700' as TextStyle['fontWeight'],
} as const;

// Font sizes
export const FONT_SIZE = {
  '2xs': 10,
  xs: 11,
  sm: 13,
  base: 15,
  lg: 17,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
} as const;

// Line heights (relative to font size)
export const LINE_HEIGHT = {
  none: 1,
  tight: 1.25,
  snug: 1.375,
  normal: 1.5,
  relaxed: 1.625,
  loose: 2,
} as const;

// Letter spacing
export const LETTER_SPACING = {
  tighter: -0.5,
  tight: -0.25,
  normal: 0,
  wide: 0.25,
  wider: 0.5,
  widest: 1,
} as const;

// Pre-composed text styles
export const TEXT_STYLES = {
  // Display - Large hero text
  displayLarge: {
    fontSize: FONT_SIZE['5xl'],
    fontWeight: FONT_WEIGHT.bold,
    lineHeight: FONT_SIZE['5xl'] * LINE_HEIGHT.tight,
    letterSpacing: LETTER_SPACING.tight,
  } as TextStyle,

  displayMedium: {
    fontSize: FONT_SIZE['4xl'],
    fontWeight: FONT_WEIGHT.bold,
    lineHeight: FONT_SIZE['4xl'] * LINE_HEIGHT.tight,
    letterSpacing: LETTER_SPACING.tight,
  } as TextStyle,

  displaySmall: {
    fontSize: FONT_SIZE['3xl'],
    fontWeight: FONT_WEIGHT.bold,
    lineHeight: FONT_SIZE['3xl'] * LINE_HEIGHT.tight,
    letterSpacing: LETTER_SPACING.normal,
  } as TextStyle,

  // Headings
  h1: {
    fontSize: FONT_SIZE['2xl'],
    fontWeight: FONT_WEIGHT.bold,
    lineHeight: FONT_SIZE['2xl'] * LINE_HEIGHT.snug,
  } as TextStyle,

  h2: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    lineHeight: FONT_SIZE.xl * LINE_HEIGHT.snug,
  } as TextStyle,

  h3: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    lineHeight: FONT_SIZE.lg * LINE_HEIGHT.snug,
  } as TextStyle,

  h4: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
    lineHeight: FONT_SIZE.base * LINE_HEIGHT.normal,
  } as TextStyle,

  // Body text
  bodyLarge: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.regular,
    lineHeight: FONT_SIZE.lg * LINE_HEIGHT.relaxed,
  } as TextStyle,

  body: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.regular,
    lineHeight: FONT_SIZE.base * LINE_HEIGHT.relaxed,
  } as TextStyle,

  bodySmall: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.regular,
    lineHeight: FONT_SIZE.sm * LINE_HEIGHT.relaxed,
  } as TextStyle,

  // Labels & Captions
  label: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    lineHeight: FONT_SIZE.sm * LINE_HEIGHT.normal,
  } as TextStyle,

  labelSmall: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium,
    lineHeight: FONT_SIZE.xs * LINE_HEIGHT.normal,
  } as TextStyle,

  caption: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.regular,
    lineHeight: FONT_SIZE.xs * LINE_HEIGHT.normal,
  } as TextStyle,

  captionSmall: {
    fontSize: FONT_SIZE['2xs'],
    fontWeight: FONT_WEIGHT.regular,
    lineHeight: FONT_SIZE['2xs'] * LINE_HEIGHT.normal,
  } as TextStyle,

  // Special
  button: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
    lineHeight: FONT_SIZE.base * LINE_HEIGHT.normal,
    letterSpacing: LETTER_SPACING.wide,
  } as TextStyle,

  buttonSmall: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    lineHeight: FONT_SIZE.sm * LINE_HEIGHT.normal,
    letterSpacing: LETTER_SPACING.wide,
  } as TextStyle,

  overline: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    lineHeight: FONT_SIZE.xs * LINE_HEIGHT.normal,
    letterSpacing: LETTER_SPACING.widest,
    textTransform: 'uppercase',
  } as TextStyle,

  tabLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium,
    lineHeight: FONT_SIZE.xs * LINE_HEIGHT.normal,
  } as TextStyle,

  // Numbers & Currency
  currency: {
    fontSize: FONT_SIZE['2xl'],
    fontWeight: FONT_WEIGHT.bold,
    lineHeight: FONT_SIZE['2xl'] * LINE_HEIGHT.tight,
    fontVariant: ['tabular-nums'],
  } as TextStyle,

  currencySmall: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    lineHeight: FONT_SIZE.lg * LINE_HEIGHT.tight,
    fontVariant: ['tabular-nums'],
  } as TextStyle,

  number: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.medium,
    lineHeight: FONT_SIZE.base * LINE_HEIGHT.normal,
    fontVariant: ['tabular-nums'],
  } as TextStyle,
} as const;
