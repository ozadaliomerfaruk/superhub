import React from 'react';
import { View, Text, ViewProps } from 'react-native';
import { useTheme } from '../../contexts';

interface DividerProps extends ViewProps {
  label?: string;
}

export function Divider({ label, className = '', ...props }: DividerProps) {
  const { isDark } = useTheme();
  const lineColor = isDark ? 'bg-slate-700' : 'bg-slate-200';
  const textColor = isDark ? 'text-slate-500' : 'text-slate-400';

  if (label) {
    return (
      <View className={`flex-row items-center my-4 ${className}`} {...props}>
        <View className={`flex-1 h-px ${lineColor}`} />
        <Text className={`px-3 text-sm font-medium ${textColor}`}>
          {label}
        </Text>
        <View className={`flex-1 h-px ${lineColor}`} />
      </View>
    );
  }

  return (
    <View
      className={`h-px my-4 ${lineColor} ${className}`}
      {...props}
    />
  );
}
