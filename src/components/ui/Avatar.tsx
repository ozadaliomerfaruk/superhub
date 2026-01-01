import React from 'react';
import { View, Text, Image, ImageStyle } from 'react-native';
import { COLORS } from '../../constants/theme';

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  source?: string;
  name?: string;
  size?: AvatarSize;
  backgroundColor?: string;
  className?: string;
}

const sizeStyles: Record<AvatarSize, { container: string; text: string; dimension: number; radius: number }> = {
  sm: {
    container: 'w-8 h-8 rounded-lg',
    text: 'text-xs',
    dimension: 32,
    radius: 8,
  },
  md: {
    container: 'w-10 h-10 rounded-xl',
    text: 'text-sm',
    dimension: 40,
    radius: 12,
  },
  lg: {
    container: 'w-14 h-14 rounded-xl',
    text: 'text-lg',
    dimension: 56,
    radius: 12,
  },
  xl: {
    container: 'w-20 h-20 rounded-2xl',
    text: 'text-2xl',
    dimension: 80,
    radius: 16,
  },
};

// Generate consistent color from name
function getColorFromName(name: string): string {
  const colors = [
    COLORS.primary[500],
    COLORS.secondary[500],
    COLORS.categories.asset,
    COLORS.categories.worker,
    COLORS.categories.document,
    '#6366f1',
    '#ec4899',
    '#14b8a6',
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}

// Get initials from name
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function Avatar({
  source,
  name = '',
  size = 'md',
  backgroundColor,
  className = '',
}: AvatarProps) {
  const sizeStyle = sizeStyles[size];
  const bgColor = backgroundColor || getColorFromName(name);
  const initials = getInitials(name);

  if (source) {
    const imageStyle: ImageStyle = {
      width: sizeStyle.dimension,
      height: sizeStyle.dimension,
      borderRadius: sizeStyle.radius,
    };
    return (
      <Image
        source={{ uri: source }}
        style={imageStyle}
      />
    );
  }

  return (
    <View
      className={`items-center justify-center ${sizeStyle.container} ${className}`}
      style={{ backgroundColor: bgColor }}
    >
      <Text className={`font-semibold text-white ${sizeStyle.text}`}>
        {initials}
      </Text>
    </View>
  );
}
