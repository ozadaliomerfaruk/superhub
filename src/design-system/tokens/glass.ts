// Design System - Glassmorphism Tokens
// Centralized glass effect definitions

import { Platform } from 'react-native';

// Glass effect intensities for BlurView
export const GLASS_BLUR = {
  none: 0,
  subtle: 10,
  light: 20,
  medium: 40,
  heavy: 60,
  intense: 80,
} as const;

// Glass background colors with transparency
export const GLASS_BACKGROUNDS = {
  light: {
    // White-based glass for light mode
    subtle: 'rgba(255, 255, 255, 0.6)',
    medium: 'rgba(255, 255, 255, 0.75)',
    solid: 'rgba(255, 255, 255, 0.9)',
    // Colored glass
    primary: 'rgba(34, 197, 94, 0.15)',
    secondary: 'rgba(245, 158, 11, 0.15)',
    danger: 'rgba(239, 68, 68, 0.15)',
  },
  dark: {
    // Dark glass for dark mode
    subtle: 'rgba(15, 23, 42, 0.6)',
    medium: 'rgba(15, 23, 42, 0.75)',
    solid: 'rgba(15, 23, 42, 0.9)',
    // Colored glass (more vibrant in dark mode)
    primary: 'rgba(34, 197, 94, 0.25)',
    secondary: 'rgba(245, 158, 11, 0.25)',
    danger: 'rgba(239, 68, 68, 0.25)',
  },
} as const;

// Glass border colors
export const GLASS_BORDERS = {
  light: {
    subtle: 'rgba(255, 255, 255, 0.3)',
    medium: 'rgba(255, 255, 255, 0.5)',
    strong: 'rgba(255, 255, 255, 0.7)',
    // Slate borders for cards
    slate: 'rgba(226, 232, 240, 0.5)', // slate-200 with opacity
  },
  dark: {
    subtle: 'rgba(255, 255, 255, 0.08)',
    medium: 'rgba(255, 255, 255, 0.15)',
    strong: 'rgba(255, 255, 255, 0.25)',
    // Slate borders for cards
    slate: 'rgba(51, 65, 85, 0.5)', // slate-700 with opacity
  },
} as const;

// Tab bar specific glass settings
export const TAB_BAR_GLASS = {
  light: {
    background: 'rgba(255, 255, 255, 0.85)',
    blur: 25,
    borderColor: 'rgba(226, 232, 240, 0.6)',
  },
  dark: {
    background: 'rgba(15, 23, 42, 0.85)',
    blur: 25,
    borderColor: 'rgba(51, 65, 85, 0.6)',
  },
} as const;

// Modal/Sheet glass settings
export const MODAL_GLASS = {
  light: {
    background: 'rgba(255, 255, 255, 0.95)',
    blur: 30,
    overlayColor: 'rgba(0, 0, 0, 0.4)',
  },
  dark: {
    background: 'rgba(30, 41, 59, 0.95)', // slate-800 based
    blur: 30,
    overlayColor: 'rgba(0, 0, 0, 0.6)',
  },
} as const;

// Card glass presets
export const CARD_GLASS = {
  light: {
    default: {
      background: 'rgba(255, 255, 255, 0.8)',
      blur: 20,
      borderColor: 'rgba(226, 232, 240, 0.5)',
    },
    elevated: {
      background: 'rgba(255, 255, 255, 0.9)',
      blur: 25,
      borderColor: 'rgba(226, 232, 240, 0.6)',
    },
    frosted: {
      background: 'rgba(248, 250, 252, 0.85)',
      blur: 30,
      borderColor: 'rgba(226, 232, 240, 0.7)',
    },
  },
  dark: {
    default: {
      background: 'rgba(30, 41, 59, 0.8)',
      blur: 20,
      borderColor: 'rgba(51, 65, 85, 0.5)',
    },
    elevated: {
      background: 'rgba(30, 41, 59, 0.9)',
      blur: 25,
      borderColor: 'rgba(51, 65, 85, 0.6)',
    },
    frosted: {
      background: 'rgba(15, 23, 42, 0.85)',
      blur: 30,
      borderColor: 'rgba(51, 65, 85, 0.7)',
    },
  },
} as const;

// Helper functions
export const getGlassBackground = (isDark: boolean) =>
  isDark ? GLASS_BACKGROUNDS.dark : GLASS_BACKGROUNDS.light;

export const getGlassBorder = (isDark: boolean) =>
  isDark ? GLASS_BORDERS.dark : GLASS_BORDERS.light;

export const getTabBarGlass = (isDark: boolean) =>
  isDark ? TAB_BAR_GLASS.dark : TAB_BAR_GLASS.light;

export const getModalGlass = (isDark: boolean) =>
  isDark ? MODAL_GLASS.dark : MODAL_GLASS.light;

export const getCardGlass = (isDark: boolean) =>
  isDark ? CARD_GLASS.dark : CARD_GLASS.light;

// Check if blur effects are well-supported
export const supportsBlur = () => {
  // iOS has excellent blur support
  // Android 12+ has improved blur support but still not perfect
  return Platform.OS === 'ios' || (Platform.OS === 'android' && Platform.Version >= 31);
};
