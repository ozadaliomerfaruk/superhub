import React from 'react';
import { TouchableOpacity, TouchableOpacityProps, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../contexts';

type IconButtonSize = 'sm' | 'md' | 'lg';
type IconButtonVariant = 'default' | 'filled' | 'tinted' | 'ghost';

interface IconButtonProps extends Omit<TouchableOpacityProps, 'children'> {
  icon: React.ReactNode;
  size?: IconButtonSize;
  variant?: IconButtonVariant;
  color?: string;
  disabled?: boolean;
}

const sizeStyles: Record<IconButtonSize, string> = {
  sm: 'w-8 h-8 rounded-lg',
  md: 'w-10 h-10 rounded-xl',
  lg: 'w-12 h-12 rounded-xl',
};

const getVariantStyles = (isDark: boolean): Record<IconButtonVariant, string> => ({
  default: isDark ? 'bg-slate-700 active:bg-slate-600' : 'bg-slate-100 active:bg-slate-200',
  filled: isDark ? 'bg-slate-600 active:bg-slate-500' : 'bg-slate-800 active:bg-slate-900',
  tinted: isDark ? 'bg-primary-900/50 active:bg-primary-800/50' : 'bg-primary-100 active:bg-primary-200',
  ghost: isDark ? 'bg-transparent active:bg-slate-800' : 'bg-transparent active:bg-slate-100',
});

export function IconButton({
  icon,
  size = 'md',
  variant = 'default',
  disabled = false,
  onPress,
  className = '',
  ...props
}: IconButtonProps) {
  const { isDark } = useTheme();
  const variantStyles = getVariantStyles(isDark);

  const handlePress = async (event: any) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.(event);
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.7}
      className={`
        items-center justify-center
        ${sizeStyles[size]}
        ${variantStyles[variant]}
        ${disabled ? 'opacity-50' : ''}
        ${className}
      `}
      {...props}
    >
      {icon}
    </TouchableOpacity>
  );
}
