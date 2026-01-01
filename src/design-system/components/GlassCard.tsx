// Design System - GlassCard Component
// Card component with glassmorphism effect

import React from 'react';
import { View, ViewStyle, StyleProp, TouchableOpacity } from 'react-native';
import { useTheme } from '../../contexts';
import { getCardGlass, supportsBlur } from '../tokens/glass';
import { getGlassShadow } from '../tokens/shadows';
import { RADIUS, COMPONENT_SPACING } from '../tokens/spacing';
import { BlurViewWrapper, isBlurAvailable } from './BlurViewWrapper';

type CardVariant = 'default' | 'elevated' | 'frosted';

interface GlassCardProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: CardVariant;
  // Padding preset
  padding?: 'none' | 'sm' | 'md' | 'lg';
  // Border radius
  borderRadius?: keyof typeof RADIUS | number;
  // Press handler (makes card pressable)
  onPress?: () => void;
  // Active opacity when pressed
  activeOpacity?: number;
  // Disable shadow
  noShadow?: boolean;
}

export function GlassCard({
  children,
  style,
  variant = 'default',
  padding = 'md',
  borderRadius = '2xl',
  onPress,
  activeOpacity = 0.8,
  noShadow = false,
}: GlassCardProps) {
  const { isDark } = useTheme();

  // Get glass config from tokens
  const glassConfig = getCardGlass(isDark)[variant];
  const shadow = noShadow ? {} : getGlassShadow('card', isDark);
  const radius = typeof borderRadius === 'number' ? borderRadius : RADIUS[borderRadius];

  // Get padding value
  const paddingValue =
    padding === 'none'
      ? 0
      : COMPONENT_SPACING.card[padding as keyof typeof COMPONENT_SPACING.card] || COMPONENT_SPACING.card.md;

  const canBlur = supportsBlur() && isBlurAvailable();

  // Container style
  const containerStyle: ViewStyle = {
    borderRadius: radius,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: glassConfig.borderColor,
    ...shadow,
  };

  // Fallback background for non-blur devices
  const fallbackBackground = isDark
    ? variant === 'elevated'
      ? '#1e293b'
      : variant === 'frosted'
      ? '#172033'
      : 'rgba(30, 41, 59, 0.95)'
    : variant === 'elevated'
    ? '#ffffff'
    : variant === 'frosted'
    ? '#f8fafc'
    : 'rgba(255, 255, 255, 0.95)';

  const cardContent = (
    <>
      {canBlur ? (
        <>
          <BlurViewWrapper
            intensity={glassConfig.blur}
            tint={isDark ? 'dark' : 'light'}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: glassConfig.background,
            }}
          />
        </>
      ) : (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: fallbackBackground,
          }}
        />
      )}
      <View style={{ padding: paddingValue, position: 'relative', zIndex: 1 }}>
        {children}
      </View>
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={activeOpacity}
        style={[containerStyle, style]}
      >
        {cardContent}
      </TouchableOpacity>
    );
  }

  return <View style={[containerStyle, style]}>{cardContent}</View>;
}

// Compact card variant for list items
export function GlassListItem({
  children,
  style,
  onPress,
  activeOpacity = 0.7,
}: {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  activeOpacity?: number;
}) {
  const { isDark } = useTheme();

  const backgroundColor = isDark
    ? 'rgba(51, 65, 85, 0.5)'
    : 'rgba(248, 250, 252, 0.8)';

  const borderColor = isDark
    ? 'rgba(51, 65, 85, 0.5)'
    : 'rgba(226, 232, 240, 0.5)';

  const Container = onPress ? TouchableOpacity : View;
  const containerProps = onPress ? { onPress, activeOpacity } : {};

  return (
    <Container
      {...containerProps}
      style={[
        {
          backgroundColor,
          borderRadius: RADIUS.xl,
          borderWidth: 1,
          borderColor,
          padding: COMPONENT_SPACING.listItem.horizontal,
        },
        style,
      ]}
    >
      {children}
    </Container>
  );
}
