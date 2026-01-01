import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  View,
  TouchableOpacityProps,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { SHADOWS } from '../../constants/theme';
import { useTheme } from '../../contexts';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<TouchableOpacityProps, 'children'> {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

const getVariantStyles = (isDark: boolean): Record<ButtonVariant, { container: string; text: string; hasShadow: boolean }> => ({
  primary: {
    container: 'bg-primary-600 active:bg-primary-700',
    text: 'text-white',
    hasShadow: !isDark,
  },
  secondary: {
    container: isDark ? 'bg-slate-700 active:bg-slate-600' : 'bg-slate-800 active:bg-slate-900',
    text: 'text-white',
    hasShadow: !isDark,
  },
  outline: {
    container: isDark
      ? 'bg-slate-800 border border-slate-700 active:bg-slate-700'
      : 'bg-white border border-slate-200 active:bg-slate-50',
    text: isDark ? 'text-slate-200' : 'text-slate-700',
    hasShadow: false,
  },
  ghost: {
    container: isDark ? 'bg-transparent active:bg-slate-800' : 'bg-transparent active:bg-slate-100',
    text: 'text-primary-600',
    hasShadow: false,
  },
  danger: {
    container: 'bg-red-500 active:bg-red-600',
    text: 'text-white',
    hasShadow: !isDark,
  },
  success: {
    container: 'bg-green-500 active:bg-green-600',
    text: 'text-white',
    hasShadow: !isDark,
  },
});

const sizeStyles: Record<ButtonSize, { container: string; text: string; iconGap: string }> = {
  sm: {
    container: 'px-4 py-2.5 rounded-xl',
    text: 'text-sm',
    iconGap: 'gap-1.5',
  },
  md: {
    container: 'px-5 py-3.5 rounded-2xl',
    text: 'text-base',
    iconGap: 'gap-2',
  },
  lg: {
    container: 'px-6 py-4 rounded-2xl',
    text: 'text-lg',
    iconGap: 'gap-2.5',
  },
};

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  onPress,
  className = '',
  style,
  ...props
}: ButtonProps) {
  const { isDark } = useTheme();
  const isDisabled = disabled || loading;
  const variantStyles = getVariantStyles(isDark);
  const variantStyle = variantStyles[variant];
  const sizeStyle = sizeStyles[size];

  const handlePress = async (event: any) => {
    if (!isDisabled) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress?.(event);
    }
  };

  const shadowStyle = variantStyle.hasShadow && !isDisabled ? SHADOWS.sm : SHADOWS.none;

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={isDisabled}
      activeOpacity={0.7}
      className={`
        flex-row items-center justify-center
        ${sizeStyle.container}
        ${variantStyle.container}
        ${fullWidth ? 'w-full' : ''}
        ${isDisabled ? 'opacity-50' : ''}
        ${className}
      `}
      style={[shadowStyle, style]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'ghost' ? (isDark ? '#94a3b8' : '#475569') : '#ffffff'}
        />
      ) : (
        <View className={`flex-row items-center ${sizeStyle.iconGap}`}>
          {icon && iconPosition === 'left' && icon}
          <Text
            className={`
              font-semibold text-center
              ${sizeStyle.text}
              ${variantStyle.text}
            `}
          >
            {title}
          </Text>
          {icon && iconPosition === 'right' && icon}
        </View>
      )}
    </TouchableOpacity>
  );
}
