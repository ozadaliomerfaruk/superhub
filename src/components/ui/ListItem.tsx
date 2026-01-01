import React from 'react';
import { View, Text, TouchableOpacity, TouchableOpacityProps } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../../constants/theme';
import { useTheme } from '../../contexts';

interface ListItemProps extends Omit<TouchableOpacityProps, 'children'> {
  title: string;
  subtitle?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  rightContent?: React.ReactNode;
  showChevron?: boolean;
  danger?: boolean;
  compact?: boolean;
}

export function ListItem({
  title,
  subtitle,
  leftIcon,
  rightIcon,
  rightContent,
  showChevron = false,
  danger = false,
  compact = false,
  className = '',
  onPress,
  ...props
}: ListItemProps) {
  const { isDark } = useTheme();

  const handlePress = async (event: any) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.(event);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handlePress}
      className={`
        flex-row items-center ${compact ? 'py-3 px-4' : 'py-4 px-5'}
        ${isDark ? 'bg-slate-800 active:bg-slate-700' : 'bg-white active:bg-slate-50'}
        ${className}
      `}
      {...props}
    >
      {leftIcon && (
        <View className={`${compact ? 'mr-3' : 'mr-4'}`}>
          {leftIcon}
        </View>
      )}

      <View className="flex-1">
        <Text
          className={`
            ${compact ? 'text-base' : 'text-[15px]'} font-medium
            ${danger ? 'text-red-600' : isDark ? 'text-slate-100' : 'text-slate-800'}
          `}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle && (
          <Text className={`text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>

      {rightContent && (
        <View className="ml-3">
          {rightContent}
        </View>
      )}

      {rightIcon && !rightContent && (
        <View className="ml-3">
          {rightIcon}
        </View>
      )}

      {showChevron && !rightIcon && !rightContent && (
        <ChevronRight size={20} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
      )}
    </TouchableOpacity>
  );
}
