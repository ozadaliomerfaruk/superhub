import React, { useEffect } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  Pressable,
  Text,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../contexts';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  snapPoints?: number[];
}

export function BottomSheet({
  visible,
  onClose,
  title,
  children,
  snapPoints = [0.5],
}: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const opacity = useSharedValue(0);
  const maxHeight = SCREEN_HEIGHT * Math.max(...snapPoints);

  useEffect(() => {
    if (visible) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
      opacity.value = withTiming(1, { duration: 200 });
    } else {
      translateY.value = withTiming(SCREEN_HEIGHT, { duration: 250 });
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const handleClose = () => {
    translateY.value = withTiming(SCREEN_HEIGHT, { duration: 250 }, () => {
      runOnJS(onClose)();
    });
    opacity.value = withTiming(0, { duration: 200 });
  };

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <Animated.View
          style={backdropStyle}
          className="absolute inset-0 bg-black/50"
        >
          <Pressable className="flex-1" onPress={handleClose} />
        </Animated.View>

        <Animated.View
          style={[sheetStyle, { maxHeight, paddingBottom: insets.bottom }]}
          className={`absolute bottom-0 left-0 right-0 rounded-t-3xl ${isDark ? 'bg-slate-800' : 'bg-white'}`}
        >
          {/* Handle */}
          <View className="items-center pt-3 pb-2">
            <View className={`w-10 h-1 rounded-full ${isDark ? 'bg-slate-600' : 'bg-slate-300'}`} />
          </View>

          {/* Title */}
          {title && (
            <View className={`px-5 pb-3 border-b ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
              <Text className={`text-lg font-bold text-center ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {title}
              </Text>
            </View>
          )}

          {/* Content */}
          <View className="px-5 py-4">{children}</View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
