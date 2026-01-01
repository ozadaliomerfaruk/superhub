// Design System - Spacing Tokens
// Consistent spacing scale throughout the app

export const SPACING = {
  // Base spacing scale (4px base unit)
  0: 0,
  px: 1,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  11: 44,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
  28: 112,
  32: 128,
} as const;

// Semantic spacing aliases
export const SPACING_SEMANTIC = {
  // Extra small - tight spacing for compact elements
  xs: SPACING[1],    // 4px
  // Small - default element spacing
  sm: SPACING[2],    // 8px
  // Medium - section padding
  md: SPACING[3],    // 12px
  // Large - card padding
  lg: SPACING[4],    // 16px
  // Extra large - major sections
  xl: SPACING[5],    // 20px
  // 2x Large - page margins
  '2xl': SPACING[6], // 24px
  // 3x Large - hero spacing
  '3xl': SPACING[8], // 32px
  // 4x Large - major gaps
  '4xl': SPACING[10], // 40px
  // 5x Large - dramatic spacing
  '5xl': SPACING[12], // 48px
} as const;

// Border radius scale
export const RADIUS = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  full: 9999,
} as const;

// Icon sizes
export const ICON_SIZE = {
  xs: 14,
  sm: 18,
  md: 22,
  lg: 26,
  xl: 32,
  '2xl': 40,
  '3xl': 48,
} as const;

// Component-specific spacing
export const COMPONENT_SPACING = {
  // Card internal padding
  card: {
    sm: SPACING[3],  // 12px
    md: SPACING[4],  // 16px
    lg: SPACING[5],  // 20px
  },
  // Button padding
  button: {
    sm: { horizontal: SPACING[3], vertical: SPACING[2] },
    md: { horizontal: SPACING[4], vertical: SPACING[3] },
    lg: { horizontal: SPACING[5], vertical: SPACING[4] },
  },
  // Input padding
  input: {
    horizontal: SPACING[4],
    vertical: SPACING[3],
  },
  // List item spacing
  listItem: {
    horizontal: SPACING[4],
    vertical: SPACING[3],
    gap: SPACING[2],
  },
  // Screen margins
  screen: {
    horizontal: SPACING[5], // 20px
    top: SPACING[4],        // 16px
    bottom: SPACING[6],     // 24px
  },
  // Tab bar
  tabBar: {
    height: 70,
    horizontalMargin: SPACING[4],
    bottomOffset: SPACING[3],
    borderRadius: RADIUS['2xl'],
    iconSize: ICON_SIZE.lg,
  },
  // Modal
  modal: {
    borderRadius: RADIUS['3xl'],
    padding: SPACING[5],
  },
} as const;
