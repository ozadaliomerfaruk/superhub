// Design System - GlassView Component
// Base glassmorphism component with blur effect

import React from 'react';
import { View, ViewStyle, StyleSheet, StyleProp } from 'react-native';
import { useTheme } from '../../contexts';
import {
  GLASS_BLUR,
  GLASS_BACKGROUNDS,
  GLASS_BORDERS,
  supportsBlur,
} from '../tokens/glass';
import { RADIUS } from '../tokens/spacing';
import { BlurViewWrapper, isBlurAvailable } from './BlurViewWrapper';

type BlurIntensity = keyof typeof GLASS_BLUR;
type BackgroundVariant = keyof typeof GLASS_BACKGROUNDS.light;
type BorderVariant = keyof typeof GLASS_BORDERS.light;

interface GlassViewProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  className?: string;
  // Blur settings
  blur?: BlurIntensity;
  // Background variant
  background?: BackgroundVariant;
  // Border variant
  border?: BorderVariant | 'none';
  // Border radius
  borderRadius?: keyof typeof RADIUS | number;
  // Overflow hidden
  overflow?: 'hidden' | 'visible';
  // iOS-only: Use native blur (performance)
  experimentalBlurMethod?: 'dimezisBlurView' | 'none';
}

export function GlassView({
  children,
  style,
  blur = 'medium',
  background = 'medium',
  border = 'subtle',
  borderRadius = 'xl',
  overflow = 'hidden',
  experimentalBlurMethod,
}: GlassViewProps) {
  const { isDark } = useTheme();

  // Get values from tokens
  const blurIntensity = GLASS_BLUR[blur];
  const backgrounds = isDark ? GLASS_BACKGROUNDS.dark : GLASS_BACKGROUNDS.light;
  const borders = isDark ? GLASS_BORDERS.dark : GLASS_BORDERS.light;

  const backgroundColor = backgrounds[background];
  const borderColor = border !== 'none' ? borders[border] : 'transparent';
  const radius = typeof borderRadius === 'number' ? borderRadius : RADIUS[borderRadius];

  // Container style
  const containerStyle: ViewStyle = {
    borderRadius: radius,
    overflow,
    borderWidth: border !== 'none' ? 1 : 0,
    borderColor,
  };

  // Check if blur is supported
  const canBlur = supportsBlur() && isBlurAvailable() && blurIntensity > 0;

  if (canBlur) {
    return (
      <View style={[containerStyle, style]}>
        <BlurViewWrapper
          intensity={blurIntensity}
          tint={isDark ? 'dark' : 'light'}
          experimentalBlurMethod={experimentalBlurMethod}
          style={StyleSheet.absoluteFill}
        />
        {/* Background overlay for color tint */}
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor },
          ]}
        />
        {/* Content */}
        <View style={{ position: 'relative', zIndex: 1 }}>
          {children}
        </View>
      </View>
    );
  }

  // Fallback for unsupported devices (solid background)
  const fallbackBackgrounds = {
    subtle: isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)',
    medium: isDark ? 'rgba(30, 41, 59, 0.97)' : 'rgba(255, 255, 255, 0.97)',
    solid: isDark ? '#1e293b' : '#ffffff',
    primary: isDark ? 'rgba(34, 197, 94, 0.25)' : 'rgba(34, 197, 94, 0.15)',
    secondary: isDark ? 'rgba(245, 158, 11, 0.25)' : 'rgba(245, 158, 11, 0.15)',
    danger: isDark ? 'rgba(239, 68, 68, 0.25)' : 'rgba(239, 68, 68, 0.15)',
  };

  return (
    <View
      style={[
        containerStyle,
        { backgroundColor: fallbackBackgrounds[background] },
        style,
      ]}
    >
      {children}
    </View>
  );
}

// Simple non-blur glass container (for nested glass elements)
export function GlassContainer({
  children,
  style,
  background = 'subtle',
  border = 'subtle',
  borderRadius = 'lg',
}: Omit<GlassViewProps, 'blur'>) {
  const { isDark } = useTheme();

  const backgrounds = isDark ? GLASS_BACKGROUNDS.dark : GLASS_BACKGROUNDS.light;
  const borders = isDark ? GLASS_BORDERS.dark : GLASS_BORDERS.light;

  const backgroundColor = backgrounds[background];
  const borderColor = border !== 'none' ? borders[border] : 'transparent';
  const radius = typeof borderRadius === 'number' ? borderRadius : RADIUS[borderRadius];

  return (
    <View
      style={[
        {
          backgroundColor,
          borderRadius: radius,
          borderWidth: border !== 'none' ? 1 : 0,
          borderColor,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
