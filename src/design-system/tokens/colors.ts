// Design System - Color Tokens
// Centralized color definitions for the entire app

export const COLORS = {
  // Primary - Fresh green for positive actions and home theme
  primary: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },

  // Secondary - Warm amber for accents
  secondary: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },

  // Neutral slate
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    150: '#e9eef4',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    850: '#172033',
    900: '#0f172a',
    950: '#020617',
  },

  // Semantic colors
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',

  // Pure colors for overlays
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
} as const;

// Background colors by theme
export const BACKGROUNDS = {
  light: {
    primary: '#ffffff',
    secondary: '#f8fafc',
    tertiary: '#f1f5f9',
    elevated: '#ffffff',
  },
  dark: {
    primary: '#0f172a',
    secondary: '#1e293b',
    tertiary: '#334155',
    elevated: '#1e293b',
  },
} as const;

// Category colors - distinct and accessible
export const CATEGORY_COLORS = {
  expense: '#ef4444',
  income: '#22c55e',
  repair: '#f97316',
  bill: '#8b5cf6',
  asset: '#06b6d4',
  worker: '#ec4899',
  document: '#6366f1',
  maintenance: '#14b8a6',
  emergency: '#dc2626',
} as const;

// Helper to get background based on theme
export const getBackgrounds = (isDark: boolean) =>
  isDark ? BACKGROUNDS.dark : BACKGROUNDS.light;
