import React from 'react';
import { View, Text, ViewProps } from 'react-native';
import { useTheme } from '../../contexts';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple' | 'cyan' | 'orange';
type BadgeSize = 'sm' | 'md';

interface BadgeProps extends ViewProps {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: React.ReactNode;
  color?: string; // Custom color - overrides variant
}

const getVariantStyles = (isDark: boolean): Record<BadgeVariant, { container: string; text: string }> => ({
  default: {
    container: isDark ? 'bg-slate-700' : 'bg-slate-100',
    text: isDark ? 'text-slate-300' : 'text-slate-700',
  },
  success: {
    container: isDark ? 'bg-green-900/50' : 'bg-green-100',
    text: isDark ? 'text-green-400' : 'text-green-700',
  },
  warning: {
    container: isDark ? 'bg-amber-900/50' : 'bg-amber-100',
    text: isDark ? 'text-amber-400' : 'text-amber-700',
  },
  error: {
    container: isDark ? 'bg-red-900/50' : 'bg-red-100',
    text: isDark ? 'text-red-400' : 'text-red-700',
  },
  info: {
    container: isDark ? 'bg-blue-900/50' : 'bg-blue-100',
    text: isDark ? 'text-blue-400' : 'text-blue-700',
  },
  purple: {
    container: isDark ? 'bg-purple-900/50' : 'bg-purple-100',
    text: isDark ? 'text-purple-400' : 'text-purple-700',
  },
  cyan: {
    container: isDark ? 'bg-cyan-900/50' : 'bg-cyan-100',
    text: isDark ? 'text-cyan-400' : 'text-cyan-700',
  },
  orange: {
    container: isDark ? 'bg-orange-900/50' : 'bg-orange-100',
    text: isDark ? 'text-orange-400' : 'text-orange-700',
  },
});

const sizeStyles: Record<BadgeSize, { container: string; text: string }> = {
  sm: {
    container: 'px-2 py-0.5 rounded-md',
    text: 'text-xs',
  },
  md: {
    container: 'px-2.5 py-1 rounded-lg',
    text: 'text-sm',
  },
};

export function Badge({
  label,
  variant = 'default',
  size = 'sm',
  icon,
  color,
  className = '',
  style,
  ...props
}: BadgeProps) {
  const { isDark } = useTheme();
  const variantStyles = getVariantStyles(isDark);
  const variantStyle = variantStyles[variant];
  const sizeStyle = sizeStyles[size];

  // If custom color is provided, use it with theme-aware opacity
  const customStyle = color
    ? { backgroundColor: `${color}${isDark ? '30' : '15'}` }
    : undefined;

  return (
    <View
      className={`
        flex-row items-center gap-1
        ${sizeStyle.container}
        ${color ? '' : variantStyle.container}
        ${className}
      `}
      style={[customStyle, style]}
      {...props}
    >
      {icon}
      <Text
        className={`font-medium ${sizeStyle.text}`}
        style={color ? { color } : undefined}
      >
        {label}
      </Text>
    </View>
  );
}
