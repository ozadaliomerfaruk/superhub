import React from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';

interface GradientBoxProps {
  colors: string[];
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  locations?: number[];
}

// Fallback component that uses a solid color instead of gradient
// Uses the first color from the colors array
export function GradientBox({ colors, style, children }: GradientBoxProps) {
  // Use the first color as background
  const backgroundColor = colors[0] || 'transparent';

  return (
    <View style={[{ backgroundColor }, style]}>
      {children}
    </View>
  );
}

// Export as LinearGradient for easy replacement
export { GradientBox as LinearGradient };
