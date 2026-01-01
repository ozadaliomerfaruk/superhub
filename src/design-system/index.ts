// Design System - Main Export
// Central export point for entire design system

// Tokens
export * from './tokens';

// Components
export * from './components';

// Re-export commonly used helpers for convenience
export {
  getBackgrounds,
  COLORS,
  BACKGROUNDS,
  CATEGORY_COLORS,
} from './tokens/colors';

export {
  getGlassBackground,
  getGlassBorder,
  getTabBarGlass,
  getModalGlass,
  getCardGlass,
  supportsBlur,
  GLASS_BLUR,
} from './tokens/glass';

export {
  SPACING,
  SPACING_SEMANTIC,
  RADIUS,
  ICON_SIZE,
  COMPONENT_SPACING,
} from './tokens/spacing';

export { TEXT_STYLES, FONT_SIZE, FONT_WEIGHT } from './tokens/typography';

export {
  SHADOWS,
  getShadow,
  getGlassShadow,
  COLORED_SHADOWS,
} from './tokens/shadows';

export {
  DURATION,
  EASING,
  SPRING,
  ANIMATION_PRESETS,
  createTiming,
  createSpring,
} from './tokens/animations';
