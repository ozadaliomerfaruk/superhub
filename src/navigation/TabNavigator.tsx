import React, { useState } from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Clock, Plus, Users, Settings } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { MainTabParamList } from './types';
import { useTheme, useTranslation } from '../contexts';
import { GlassTabBar, COLORS } from '../design-system';

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

// Custom icon renderer for the center button
function renderTabIcon({ route, focused, color, size }: { route: any; focused: boolean; color: string; size: number }) {
  const strokeWidth = focused ? 2.5 : 2;

  switch (route.name) {
    case 'Home':
      return <Home size={size} color={color} strokeWidth={strokeWidth} />;
    case 'Timeline':
      return <Clock size={size} color={color} strokeWidth={strokeWidth} />;
    case 'QuickAdd':
      // Center button - special styling handled separately
      return (
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
      );
    case 'Workers':
      return <Users size={size} color={color} strokeWidth={strokeWidth} />;
    case 'Settings':
      return <Settings size={size} color={color} strokeWidth={strokeWidth} />;
    default:
      return null;
  }
}

export function TabNavigator() {
  const [quickAddVisible, setQuickAddVisible] = useState(false);
  const { isDark } = useTheme();
  const { t } = useTranslation();

  return (
    <>
      <Tab.Navigator
        tabBar={(props) => (
          <GlassTabBar
            {...props}
            renderIcon={renderTabIcon}
          />
        )}
        screenOptions={{
          headerShown: false,
          tabBarHideOnKeyboard: true,
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            tabBarLabel: t('tabs.home'),
          }}
          listeners={{
            tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
          }}
        />

        <Tab.Screen
          name="Timeline"
          component={TimelineScreen}
          options={{
            tabBarLabel: t('tabs.timeline'),
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
            tabBarLabel: t('tabs.workers'),
          }}
          listeners={{
            tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
          }}
        />

        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            tabBarLabel: t('tabs.settings'),
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
