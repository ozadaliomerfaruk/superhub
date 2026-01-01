import React, { useState } from 'react';
import { View, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Clock, Plus, Users, Settings } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { MainTabParamList } from './types';
import { COLORS } from '../constants/theme';
import { useTheme } from '../contexts';

// Screens
import { HomeScreen } from '../screens/home/HomeScreen';
import { TimelineScreen } from '../screens/timeline/TimelineScreen';
import { WorkersScreen } from '../screens/workers/WorkersScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';

// Components
import { QuickAddSheet } from '../components/QuickAddSheet';

const Tab = createBottomTabNavigator<MainTabParamList>();

interface TabBarIconProps {
  focused: boolean;
  color: string;
  size: number;
}

function QuickAddPlaceholder() {
  return null;
}

export function TabNavigator() {
  const insets = useSafeAreaInsets();
  const [quickAddVisible, setQuickAddVisible] = useState(false);
  const { isDark } = useTheme();

  return (
    <>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: isDark ? COLORS.slate[900] : '#ffffff',
            borderTopColor: isDark ? COLORS.slate[800] : COLORS.slate[100],
            borderTopWidth: 1,
            height: 60 + insets.bottom,
            paddingTop: 8,
            paddingBottom: insets.bottom + 8,
            ...Platform.select({
              ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: isDark ? 0.3 : 0.05,
                shadowRadius: 8,
              },
              android: {
                elevation: 8,
              },
            }),
          },
          tabBarActiveTintColor: COLORS.primary[isDark ? 400 : 600],
          tabBarInactiveTintColor: isDark ? COLORS.slate[500] : COLORS.slate[400],
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
            marginTop: 2,
          },
          tabBarHideOnKeyboard: true,
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            tabBarLabel: 'Home',
            tabBarIcon: ({ focused, color }: TabBarIconProps) => (
              <Home
                size={22}
                color={color}
                strokeWidth={focused ? 2.5 : 2}
              />
            ),
          }}
          listeners={{
            tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
          }}
        />

        <Tab.Screen
          name="Timeline"
          component={TimelineScreen}
          options={{
            tabBarLabel: 'Timeline',
            tabBarIcon: ({ focused, color }: TabBarIconProps) => (
              <Clock
                size={22}
                color={color}
                strokeWidth={focused ? 2.5 : 2}
              />
            ),
          }}
          listeners={{
            tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
          }}
        />

        <Tab.Screen
          name="QuickAdd"
          component={QuickAddPlaceholder}
          options={{
            tabBarLabel: '',
            tabBarIcon: () => (
              <View
                className="w-14 h-14 -mt-6 rounded-full bg-primary-600 items-center justify-center"
                style={{
                  shadowColor: COLORS.primary[600],
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 8,
                }}
              >
                <Plus size={28} color="white" strokeWidth={2.5} />
              </View>
            ),
          }}
          listeners={() => ({
            tabPress: (e) => {
              e.preventDefault();
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setQuickAddVisible(true);
            },
          })}
        />

        <Tab.Screen
          name="Workers"
          component={WorkersScreen}
          options={{
            tabBarLabel: 'Workers',
            tabBarIcon: ({ focused, color }: TabBarIconProps) => (
              <Users
                size={22}
                color={color}
                strokeWidth={focused ? 2.5 : 2}
              />
            ),
          }}
          listeners={{
            tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
          }}
        />

        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            tabBarLabel: 'Settings',
            tabBarIcon: ({ focused, color }: TabBarIconProps) => (
              <Settings
                size={22}
                color={color}
                strokeWidth={focused ? 2.5 : 2}
              />
            ),
          }}
          listeners={{
            tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
          }}
        />
      </Tab.Navigator>

      <QuickAddSheet
        visible={quickAddVisible}
        onClose={() => setQuickAddVisible(false)}
      />
    </>
  );
}
