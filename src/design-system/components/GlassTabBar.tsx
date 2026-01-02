// Design System - GlassTabBar Component
// Floating tab bar with glassmorphism effect

import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../contexts';
import { getTabBarGlass, supportsBlur } from '../tokens/glass';
import { getGlassShadow } from '../tokens/shadows';
import { COMPONENT_SPACING, ICON_SIZE } from '../tokens/spacing';
import { TEXT_STYLES } from '../tokens/typography';
import { COLORS } from '../tokens/colors';
import { BlurViewWrapper, isBlurAvailable } from './BlurViewWrapper';

interface GlassTabBarProps extends BottomTabBarProps {
  // Custom icon renderer
  renderIcon?: (props: {
    route: any;
    focused: boolean;
    color: string;
    size: number;
  }) => React.ReactNode;
}

export function GlassTabBar({
  state,
  descriptors,
  navigation,
  renderIcon,
}: GlassTabBarProps) {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();

  // Get glass config
  const glassConfig = getTabBarGlass(isDark);
  const shadow = getGlassShadow('tabBar', isDark);
  const canBlur = supportsBlur() && isBlurAvailable();

  // Tab bar dimensions
  const { height, horizontalMargin, bottomOffset, borderRadius, iconSize } =
    COMPONENT_SPACING.tabBar;

  // Fallback background
  const fallbackBackground = isDark ? '#1e293b' : '#ffffff';

  // Colors
  const activeColor = COLORS.primary[500];
  const inactiveColor = isDark ? COLORS.slate[400] : COLORS.slate[500];

  const handlePress = async (route: any, isFocused: boolean) => {
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });

    if (!isFocused && !event.defaultPrevented) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      navigation.navigate(route.name);
    }
  };

  const handleLongPress = (route: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.emit({
      type: 'tabLongPress',
      target: route.key,
    });
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: Math.max(insets.bottom, bottomOffset),
          paddingHorizontal: horizontalMargin,
        },
      ]}
      pointerEvents="box-none"
    >
      <View
        style={[
          styles.tabBar,
          {
            height,
            borderRadius,
            borderColor: glassConfig.borderColor,
            ...shadow,
          },
        ]}
      >
        {/* Blur background */}
        {canBlur ? (
          <>
            <BlurViewWrapper
              intensity={glassConfig.blur}
              tint={isDark ? 'dark' : 'light'}
              style={[StyleSheet.absoluteFill, { borderRadius, overflow: 'hidden' }]}
            />
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: glassConfig.background, borderRadius, overflow: 'hidden' },
              ]}
            />
          </>
        ) : (
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: fallbackBackground, borderRadius, overflow: 'hidden' },
            ]}
          />
        )}

        {/* Tab items */}
        <View style={styles.tabsContainer}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === index;

            const label =
              options.tabBarLabel !== undefined
                ? options.tabBarLabel
                : options.title !== undefined
                ? options.title
                : route.name;

            const color = isFocused ? activeColor : inactiveColor;

            return (
              <TouchableOpacity
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                onPress={() => handlePress(route, isFocused)}
                onLongPress={() => handleLongPress(route)}
                style={styles.tab}
                activeOpacity={0.7}
              >
                {/* Icon */}
                <View style={styles.iconContainer}>
                  {renderIcon ? (
                    renderIcon({
                      route,
                      focused: isFocused,
                      color,
                      size: iconSize,
                    })
                  ) : options.tabBarIcon ? (
                    options.tabBarIcon({
                      focused: isFocused,
                      color,
                      size: iconSize,
                    })
                  ) : null}
                </View>

                {/* Label */}
                <Text
                  style={[
                    styles.label,
                    TEXT_STYLES.tabLabel,
                    {
                      color,
                      opacity: isFocused ? 1 : 0.8,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {typeof label === 'string' ? label : route.name}
                </Text>

                {/* Active indicator */}
                {isFocused && (
                  <View
                    style={[
                      styles.activeIndicator,
                      { backgroundColor: activeColor },
                    ]}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabBar: {
    flexDirection: 'row',
    borderWidth: 1,
    overflow: 'visible',
  },
  tabsContainer: {
    flex: 1,
    flexDirection: 'row',
    position: 'relative',
    zIndex: 1,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  iconContainer: {
    marginBottom: 2,
  },
  label: {
    marginTop: 2,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 6,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
