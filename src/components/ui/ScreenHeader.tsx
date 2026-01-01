import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../../constants/theme';
import { useTheme } from '../../contexts';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  leftAction?: React.ReactNode;
  large?: boolean;
  transparent?: boolean;
  borderless?: boolean;
}

export function ScreenHeader({
  title,
  subtitle,
  showBack = false,
  onBack,
  rightAction,
  leftAction,
  large = false,
  transparent = false,
  borderless = false,
}: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();

  const handleBack = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onBack?.();
  };

  return (
    <View
      className={`
        ${transparent ? 'bg-transparent' : isDark ? 'bg-slate-900' : 'bg-white'}
        ${borderless ? '' : isDark ? 'border-b border-slate-800' : 'border-b border-slate-100'}
      `}
      style={{ paddingTop: insets.top }}
    >
      <View className={`flex-row items-center justify-between px-5 ${large ? 'py-4' : 'py-3'}`}>
        {/* Left side */}
        <View className="flex-row items-center flex-1">
          {showBack && onBack && (
            <TouchableOpacity
              onPress={handleBack}
              className={`w-10 h-10 items-center justify-center -ml-2 mr-2 rounded-full ${isDark ? 'active:bg-slate-800' : 'active:bg-slate-100'}`}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <ArrowLeft size={24} color={isDark ? COLORS.slate[300] : COLORS.slate[800]} />
            </TouchableOpacity>
          )}

          {leftAction && !showBack && (
            <View className="mr-3">
              {leftAction}
            </View>
          )}

          <View className="flex-1">
            <Text
              className={`
                font-bold ${isDark ? 'text-white' : 'text-slate-900'}
                ${large ? 'text-2xl' : 'text-lg'}
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
        </View>

        {/* Right side */}
        {rightAction && (
          <View className="ml-4 flex-row items-center gap-2">
            {rightAction}
          </View>
        )}
      </View>
    </View>
  );
}
