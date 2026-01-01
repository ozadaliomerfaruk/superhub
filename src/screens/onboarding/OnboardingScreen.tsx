import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Dimensions,
  FlatList,
  TouchableOpacity,
  ViewToken,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import {
  Home,
  Wrench,
  DollarSign,
  Bell,
  Users,
  CheckCircle2,
  ArrowRight,
  ChevronRight,
} from 'lucide-react-native';
import { COLORS } from '../../constants/theme';
import { useTheme } from '../../contexts';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const ONBOARDING_COMPLETE_KEY = '@hometrack/onboarding_complete';

interface OnboardingSlide {
  id: string;
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
}

const slides: OnboardingSlide[] = [
  {
    id: '1',
    icon: <Home size={48} color={COLORS.primary[600]} />,
    iconBg: COLORS.primary[100],
    title: 'Welcome to HomeTrack',
    description:
      'Your complete home management solution. Track properties, assets, maintenance, and expenses all in one place.',
  },
  {
    id: '2',
    icon: <Wrench size={48} color={COLORS.secondary[600]} />,
    iconBg: COLORS.secondary[100],
    title: 'Manage Maintenance',
    description:
      'Schedule recurring maintenance tasks, set reminders, and never miss important upkeep for your properties.',
  },
  {
    id: '3',
    icon: <DollarSign size={48} color={COLORS.success} />,
    iconBg: '#dcfce7',
    title: 'Track Expenses',
    description:
      'Log repairs, bills, and purchases. View spending trends and keep all receipts organized by property.',
  },
  {
    id: '4',
    icon: <Users size={48} color={COLORS.info} />,
    iconBg: '#dbeafe',
    title: 'Worker Directory',
    description:
      'Save contact info for contractors, plumbers, electricians, and other service providers you trust.',
  },
  {
    id: '5',
    icon: <Bell size={48} color={COLORS.warning} />,
    iconBg: '#fef3c7',
    title: 'Stay Notified',
    description:
      'Get alerts for upcoming maintenance, warranty expirations, and overdue tasks so nothing falls through the cracks.',
  },
];

interface OnboardingScreenProps {
  onComplete: () => void;
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const viewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setCurrentIndex(viewableItems[0].index);
      }
    }
  ).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const handleNext = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      await completeOnboarding();
    }
  };

  const handleSkip = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    await completeOnboarding();
  };

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
      onComplete();
    } catch (error) {
      console.error('Failed to save onboarding status:', error);
      onComplete();
    }
  };

  const renderSlide = ({ item }: { item: OnboardingSlide }) => (
    <View
      style={{ width: SCREEN_WIDTH }}
      className="flex-1 items-center justify-center px-8"
    >
      <View
        className="w-28 h-28 rounded-3xl items-center justify-center mb-8"
        style={{ backgroundColor: item.iconBg }}
      >
        {item.icon}
      </View>
      <Text
        className={`text-2xl font-bold text-center mb-4 ${
          isDark ? 'text-white' : 'text-slate-900'
        }`}
      >
        {item.title}
      </Text>
      <Text
        className={`text-base text-center leading-6 ${
          isDark ? 'text-slate-400' : 'text-slate-600'
        }`}
      >
        {item.description}
      </Text>
    </View>
  );

  const renderDots = () => (
    <View className="flex-row items-center justify-center gap-2 mb-8">
      {slides.map((_, index) => {
        const inputRange = [
          (index - 1) * SCREEN_WIDTH,
          index * SCREEN_WIDTH,
          (index + 1) * SCREEN_WIDTH,
        ];

        const dotWidth = scrollX.interpolate({
          inputRange,
          outputRange: [8, 24, 8],
          extrapolate: 'clamp',
        });

        const opacity = scrollX.interpolate({
          inputRange,
          outputRange: [0.3, 1, 0.3],
          extrapolate: 'clamp',
        });

        return (
          <Animated.View
            key={index}
            style={{
              width: dotWidth,
              opacity,
              height: 8,
              borderRadius: 4,
              backgroundColor: COLORS.primary[600],
            }}
          />
        );
      })}
    </View>
  );

  const isLastSlide = currentIndex === slides.length - 1;

  return (
    <View
      className={`flex-1 ${isDark ? 'bg-slate-900' : 'bg-white'}`}
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      {/* Skip button */}
      <View className="flex-row justify-end px-6 py-4">
        {!isLastSlide && (
          <TouchableOpacity
            onPress={handleSkip}
            className="px-4 py-2"
            activeOpacity={0.7}
          >
            <Text className={`text-base font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Skip
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onViewableItemsChanged={viewableItemsChanged}
        viewabilityConfig={viewConfig}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        className="flex-1"
      />

      {/* Bottom section */}
      <View className="px-6 pb-4">
        {renderDots()}

        <TouchableOpacity
          onPress={handleNext}
          activeOpacity={0.8}
          className="flex-row items-center justify-center py-4 rounded-2xl"
          style={{ backgroundColor: COLORS.primary[600] }}
        >
          {isLastSlide ? (
            <>
              <CheckCircle2 size={20} color="#fff" />
              <Text className="text-white font-bold text-base ml-2">
                Get Started
              </Text>
            </>
          ) : (
            <>
              <Text className="text-white font-bold text-base mr-2">Next</Text>
              <ChevronRight size={20} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
