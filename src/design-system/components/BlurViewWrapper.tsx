// Design System - BlurView Wrapper
// Safely wraps expo-blur for Expo Go compatibility

import React from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';

// Try to import BlurView, fallback to View if not available
let BlurViewComponent: React.ComponentType<any> | null = null;
let blurAvailable = false;

try {
  const ExpoBlur = require('expo-blur');
  BlurViewComponent = ExpoBlur.BlurView;
  blurAvailable = true;
} catch (e) {
  // expo-blur not available (e.g., in Expo Go)
  blurAvailable = false;
}

interface BlurViewWrapperProps {
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  experimentalBlurMethod?: 'dimezisBlurView' | 'none';
  // Fallback background color when blur is not available
  fallbackColor?: string;
}

export function BlurViewWrapper({
  intensity = 50,
  tint = 'default',
  style,
  children,
  experimentalBlurMethod,
  fallbackColor = 'transparent',
}: BlurViewWrapperProps) {
  // If blur is available and we have a valid component, use it
  if (blurAvailable && BlurViewComponent) {
    return (
      <BlurViewComponent
        intensity={intensity}
        tint={tint}
        style={style}
        experimentalBlurMethod={experimentalBlurMethod}
      >
        {children}
      </BlurViewComponent>
    );
  }

  // Fallback: use a regular View with the fallback color
  return (
    <View style={[{ backgroundColor: fallbackColor }, style]}>
      {children}
    </View>
  );
}

// Export whether blur is available
export const isBlurAvailable = () => blurAvailable;
