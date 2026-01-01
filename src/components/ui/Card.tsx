import React from 'react';
import { View, TouchableOpacity, ViewProps, TouchableOpacityProps } from 'react-native';
import * as Haptics from 'expo-haptics';
import { SHADOWS } from '../../constants/theme';
import { useTheme } from '../../contexts';

interface CardProps extends ViewProps {
  variant?: 'default' | 'elevated' | 'outlined' | 'filled';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

interface PressableCardProps extends Omit<TouchableOpacityProps, 'children'> {
  variant?: 'default' | 'elevated' | 'outlined' | 'filled';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  haptic?: boolean;
}

type ShadowStyle = typeof SHADOWS[keyof typeof SHADOWS];

const getVariantStyles = (isDark: boolean): Record<string, { className: string; shadow: ShadowStyle }> => ({
  default: {
    className: isDark ? 'bg-slate-800' : 'bg-white',
    shadow: isDark ? SHADOWS.none : SHADOWS.sm
  },
  elevated: {
    className: isDark ? 'bg-slate-800' : 'bg-white',
    shadow: isDark ? SHADOWS.none : SHADOWS.md
  },
  outlined: {
    className: isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200',
    shadow: SHADOWS.none
  },
  filled: {
    className: isDark ? 'bg-slate-800/50' : 'bg-slate-50',
    shadow: SHADOWS.none
  },
});

const paddingStyles: Record<string, string> = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
};

export function Card({
  variant = 'default',
  padding = 'md',
  className = '',
  style,
  children,
  ...props
}: CardProps) {
  const { isDark } = useTheme();
  const variantStyles = getVariantStyles(isDark);
  const variantStyle = variantStyles[variant];

  return (
    <View
      className={`
        rounded-2xl overflow-hidden
        ${variantStyle.className}
        ${paddingStyles[padding]}
        ${className}
      `}
      style={[variantStyle.shadow, style]}
      {...props}
    >
      {children}
    </View>
  );
}

export function PressableCard({
  variant = 'default',
  padding = 'md',
  className = '',
  style,
  children,
  haptic = true,
  onPress,
  ...props
}: PressableCardProps) {
  const { isDark } = useTheme();
  const variantStyles = getVariantStyles(isDark);
  const variantStyle = variantStyles[variant];

  const handlePress = async (event: any) => {
    if (haptic) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.(event);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handlePress}
      className={`
        rounded-2xl overflow-hidden
        ${variantStyle.className}
        ${paddingStyles[padding]}
        ${className}
      `}
      style={[variantStyle.shadow, style]}
      {...props}
    >
      {children}
    </TouchableOpacity>
  );
}
