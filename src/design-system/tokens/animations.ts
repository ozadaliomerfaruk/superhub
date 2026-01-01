// Design System - Animation Tokens
// Consistent animation timings and easing curves

import { Easing, EasingFunction } from 'react-native';

// Duration tokens (in milliseconds)
export const DURATION = {
  instant: 0,
  fastest: 100,
  fast: 150,
  normal: 250,
  slow: 400,
  slower: 600,
  slowest: 1000,
} as const;

// Semantic durations
export const DURATION_SEMANTIC = {
  // User feedback (buttons, toggles)
  feedback: DURATION.fast,
  // UI state changes (expand, collapse)
  state: DURATION.normal,
  // Modal/sheet animations
  modal: DURATION.slow,
  // Page transitions
  navigation: DURATION.normal,
  // Subtle decorative animations
  decorative: DURATION.slower,
} as const;

// Easing curves
export const EASING = {
  // Standard Material Design curves
  standard: Easing.bezier(0.4, 0.0, 0.2, 1),
  decelerate: Easing.bezier(0.0, 0.0, 0.2, 1),
  accelerate: Easing.bezier(0.4, 0.0, 1, 1),

  // iOS-like curves
  easeIn: Easing.ease,
  easeOut: Easing.out(Easing.ease),
  easeInOut: Easing.inOut(Easing.ease),

  // Bounce effects
  bounce: Easing.bounce,
  elastic: Easing.elastic(1),

  // Linear
  linear: Easing.linear,
} as const;

// Spring configurations for Animated.spring()
export const SPRING = {
  // Gentle - Slow, smooth movement
  gentle: {
    damping: 30,
    stiffness: 150,
    mass: 1,
  },
  // Default - Balanced response
  default: {
    damping: 20,
    stiffness: 300,
    mass: 1,
  },
  // Snappy - Quick, responsive
  snappy: {
    damping: 15,
    stiffness: 400,
    mass: 0.8,
  },
  // Bouncy - Playful overshoot
  bouncy: {
    damping: 10,
    stiffness: 350,
    mass: 0.9,
  },
  // Stiff - Minimal overshoot
  stiff: {
    damping: 25,
    stiffness: 500,
    mass: 1,
  },
} as const;

// Pre-composed animation configurations
export const ANIMATION_PRESETS = {
  // Fade in/out
  fadeIn: {
    duration: DURATION.normal,
    easing: EASING.easeOut,
  },
  fadeOut: {
    duration: DURATION.fast,
    easing: EASING.easeIn,
  },

  // Slide animations
  slideUp: {
    duration: DURATION.normal,
    easing: EASING.decelerate,
  },
  slideDown: {
    duration: DURATION.normal,
    easing: EASING.accelerate,
  },
  slideIn: {
    duration: DURATION.normal,
    easing: EASING.decelerate,
  },
  slideOut: {
    duration: DURATION.fast,
    easing: EASING.accelerate,
  },

  // Scale animations
  scaleIn: {
    duration: DURATION.fast,
    easing: EASING.easeOut,
    fromScale: 0.9,
  },
  scaleOut: {
    duration: DURATION.fast,
    easing: EASING.easeIn,
    toScale: 0.9,
  },

  // Press feedback
  pressIn: {
    duration: DURATION.fastest,
    toScale: 0.97,
  },
  pressOut: {
    duration: DURATION.fast,
    toScale: 1,
  },

  // Modal/Sheet
  modalEnter: {
    spring: SPRING.default,
  },
  modalExit: {
    duration: DURATION.normal,
    easing: EASING.accelerate,
  },

  // Tab bar
  tabTransition: {
    duration: DURATION.fast,
    easing: EASING.easeInOut,
  },
} as const;

// Stagger delay for list animations
export const STAGGER = {
  fast: 30,
  normal: 50,
  slow: 80,
} as const;

// Helper function to create timing config
export const createTiming = (
  duration: number,
  easing: EasingFunction = EASING.standard
) => ({
  duration,
  easing,
  useNativeDriver: true,
});

// Helper function to create spring config
export const createSpring = (preset: keyof typeof SPRING = 'default') => ({
  ...SPRING[preset],
  useNativeDriver: true,
});
