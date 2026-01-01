import React from 'react';
import { TouchableOpacity, TouchableOpacityProps, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Plus } from 'lucide-react-native';
import { COLORS } from '../../constants/theme';
import { useTheme } from '../../contexts';

interface FABProps extends Omit<TouchableOpacityProps, 'children'> {
  icon?: React.ReactNode;
  size?: 'md' | 'lg';
  variant?: 'primary' | 'secondary';
}

const sizeStyles = {
  md: 'w-14 h-14',
  lg: 'w-16 h-16',
};

const getVariantStyles = (isDark: boolean) => ({
  primary: 'bg-primary-600 active:bg-primary-700',
  secondary: isDark ? 'bg-slate-700 active:bg-slate-600' : 'bg-slate-800 active:bg-slate-900',
});

export function FAB({
  icon,
  size = 'lg',
  variant = 'primary',
  onPress,
  className = '',
  ...props
}: FABProps) {
  const { isDark } = useTheme();
  const variantStyles = getVariantStyles(isDark);

  const handlePress = async (event: any) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress?.(event);
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.85}
      className={`
        items-center justify-center rounded-full
        shadow-xl
        ${sizeStyles[size]}
        ${variantStyles[variant]}
        ${className}
      `}
      style={{
        shadowColor: variant === 'primary' ? COLORS.primary[600] : '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDark ? 0.5 : 0.3,
        shadowRadius: 8,
        elevation: 8,
      }}
      {...props}
    >
      {icon || <Plus size={28} color="white" strokeWidth={2.5} />}
    </TouchableOpacity>
  );
}
