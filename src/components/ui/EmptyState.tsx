import React from 'react';
import { View, Text } from 'react-native';
import { Button } from './Button';
import { useTheme } from '../../contexts';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const { isDark } = useTheme();

  return (
    <View className="flex-1 items-center justify-center px-8 py-12">
      <View className={`w-20 h-20 rounded-full items-center justify-center mb-5 ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
        {icon}
      </View>

      <Text className={`text-xl font-bold text-center mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>
        {title}
      </Text>

      <Text className={`text-base text-center mb-6 leading-6 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        {description}
      </Text>

      {actionLabel && onAction && (
        <Button
          title={actionLabel}
          variant="primary"
          onPress={onAction}
        />
      )}
    </View>
  );
}
