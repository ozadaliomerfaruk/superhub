import React, { useEffect } from 'react';
import {
  View,
  Modal,
  Pressable,
  Text,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
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
import {
  getModalGlass,
  getGlassShadow,
  supportsBlur,
  RADIUS,
  SPRING,
  DURATION,
  BlurViewWrapper,
  isBlurAvailable,
} from '../../design-system';

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

  // Glass config
  const glassConfig = getModalGlass(isDark);
  const shadow = getGlassShadow('modal', isDark);
  const canBlur = supportsBlur() && isBlurAvailable();

  // Fallback background
  const fallbackBackground = isDark ? '#1e293b' : '#ffffff';

  useEffect(() => {
    if (visible) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      translateY.value = withSpring(0, SPRING.default);
      opacity.value = withTiming(1, { duration: DURATION.normal });
    } else {
      translateY.value = withTiming(SCREEN_HEIGHT, { duration: DURATION.normal });
      opacity.value = withTiming(0, { duration: DURATION.normal });
    }
  }, [visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const handleClose = () => {
    translateY.value = withTiming(SCREEN_HEIGHT, { duration: DURATION.normal }, () => {
      runOnJS(onClose)();
    });
    opacity.value = withTiming(0, { duration: DURATION.normal });
  };

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* Backdrop */}
        <Animated.View
          style={[backdropStyle, { backgroundColor: glassConfig.overlayColor }]}
          className="absolute inset-0"
        >
          <Pressable className="flex-1" onPress={handleClose} />
        </Animated.View>

        {/* Sheet */}
        <Animated.View
          style={[
            sheetStyle,
            {
              maxHeight,
              paddingBottom: insets.bottom,
              borderTopLeftRadius: RADIUS['3xl'],
              borderTopRightRadius: RADIUS['3xl'],
              ...shadow,
            },
          ]}
          className="absolute bottom-0 left-0 right-0 overflow-hidden"
        >
          {/* Glass Background */}
          {canBlur ? (
            <>
              <BlurViewWrapper
                intensity={glassConfig.blur}
                tint={isDark ? 'dark' : 'light'}
                style={[
                  StyleSheet.absoluteFill,
                  {
                    borderTopLeftRadius: RADIUS['3xl'],
                    borderTopRightRadius: RADIUS['3xl'],
                  },
                ]}
              />
              <View
                style={[
                  StyleSheet.absoluteFill,
                  {
                    backgroundColor: glassConfig.background,
                    borderTopLeftRadius: RADIUS['3xl'],
                    borderTopRightRadius: RADIUS['3xl'],
                  },
                ]}
              />
            </>
          ) : (
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: fallbackBackground,
                  borderTopLeftRadius: RADIUS['3xl'],
                  borderTopRightRadius: RADIUS['3xl'],
                },
              ]}
            />
          )}

          {/* Handle */}
          <View className="items-center pt-3 pb-2" style={{ position: 'relative', zIndex: 1 }}>
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: isDark ? 'rgba(148, 163, 184, 0.4)' : 'rgba(148, 163, 184, 0.5)',
              }}
            />
          </View>

          {/* Title */}
          {title && (
            <View
              className={`px-5 pb-3 border-b ${isDark ? 'border-slate-700/50' : 'border-slate-200/50'}`}
              style={{ position: 'relative', zIndex: 1 }}
            >
              <Text className={`text-lg font-bold text-center ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {title}
              </Text>
            </View>
          )}

          {/* Content */}
          <View className="px-5 py-4" style={{ position: 'relative', zIndex: 1 }}>
            {children}
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
