// Design System - GlassModal Component
// Modal and sheet components with glassmorphism effect

import React, { useRef, useEffect } from 'react';
import {
  View,
  Modal,
  TouchableWithoutFeedback,
  Animated,
  Dimensions,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts';
import { getModalGlass, supportsBlur } from '../tokens/glass';
import { getGlassShadow } from '../tokens/shadows';
import { RADIUS, COMPONENT_SPACING } from '../tokens/spacing';
import { SPRING, DURATION, EASING } from '../tokens/animations';
import { BlurViewWrapper, isBlurAvailable } from './BlurViewWrapper';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface GlassSheetProps {
  visible: boolean;
  onClose: () => void;
  children?: React.ReactNode;
  // Height as percentage of screen (0-1) or 'auto'
  height?: number | 'auto';
  // Show drag handle
  showHandle?: boolean;
  // Enable keyboard avoiding
  keyboardAvoiding?: boolean;
  // Custom style
  style?: StyleProp<ViewStyle>;
}

export function GlassSheet({
  visible,
  onClose,
  children,
  height = 'auto',
  showHandle = true,
  keyboardAvoiding = true,
  style,
}: GlassSheetProps) {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();

  // Animation values
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Get glass config
  const glassConfig = getModalGlass(isDark);
  const shadow = getGlassShadow('modal', isDark);
  const canBlur = supportsBlur() && isBlurAvailable();

  // Fallback background
  const fallbackBackground = isDark ? '#1e293b' : '#ffffff';

  useEffect(() => {
    if (visible) {
      // Animate in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: DURATION.normal,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          ...SPRING.default,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animate out
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: DURATION.fast,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: DURATION.normal,
          easing: EASING.accelerate,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, slideAnim]);

  const sheetHeight =
    height === 'auto'
      ? undefined
      : { height: SCREEN_HEIGHT * height, maxHeight: SCREEN_HEIGHT * 0.9 };

  const SheetContent = (
    <Animated.View
      style={[
        styles.sheet,
        shadow,
        {
          transform: [{ translateY: slideAnim }],
          paddingBottom: insets.bottom + 16,
          borderTopLeftRadius: RADIUS['3xl'],
          borderTopRightRadius: RADIUS['3xl'],
        },
        sheetHeight,
        style,
      ]}
    >
      {/* Glass background */}
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
      {showHandle && (
        <View style={styles.handleContainer}>
          <View
            style={[
              styles.handle,
              {
                backgroundColor: isDark ? 'rgba(148, 163, 184, 0.4)' : 'rgba(148, 163, 184, 0.5)',
              },
            ]}
          />
        </View>
      )}

      {/* Content */}
      <View style={{ position: 'relative', zIndex: 1, flex: 1 }}>
        {children}
      </View>
    </Animated.View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Backdrop */}
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: fadeAnim,
              backgroundColor: glassConfig.overlayColor,
            },
          ]}
        >
          <TouchableWithoutFeedback onPress={onClose}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
        </Animated.View>

        {/* Sheet */}
        {keyboardAvoiding ? (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardView}
            pointerEvents="box-none"
          >
            {SheetContent}
          </KeyboardAvoidingView>
        ) : (
          SheetContent
        )}
      </View>
    </Modal>
  );
}

// Center modal variant
interface GlassCenterModalProps {
  visible: boolean;
  onClose: () => void;
  children?: React.ReactNode;
  width?: number | `${number}%`;
  style?: StyleProp<ViewStyle>;
}

export function GlassCenterModal({
  visible,
  onClose,
  children,
  width = '85%' as `${number}%`,
  style,
}: GlassCenterModalProps) {
  const { isDark } = useTheme();

  // Animation values
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Get glass config
  const glassConfig = getModalGlass(isDark);
  const shadow = getGlassShadow('modal', isDark);
  const canBlur = supportsBlur() && isBlurAvailable();

  // Fallback background
  const fallbackBackground = isDark ? '#1e293b' : '#ffffff';

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: DURATION.normal,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          ...SPRING.snappy,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: DURATION.fast,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: DURATION.fast,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, scaleAnim]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.centerContainer}>
        {/* Backdrop */}
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: fadeAnim,
              backgroundColor: glassConfig.overlayColor,
            },
          ]}
        >
          <TouchableWithoutFeedback onPress={onClose}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
        </Animated.View>

        {/* Modal */}
        <Animated.View
          style={[
            styles.centerModal,
            shadow,
            {
              width,
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
              borderRadius: RADIUS['2xl'],
            },
            style,
          ]}
        >
          {/* Glass background */}
          {canBlur ? (
            <>
              <BlurViewWrapper
                intensity={glassConfig.blur}
                tint={isDark ? 'dark' : 'light'}
                style={[
                  StyleSheet.absoluteFill,
                  { borderRadius: RADIUS['2xl'] },
                ]}
              />
              <View
                style={[
                  StyleSheet.absoluteFill,
                  {
                    backgroundColor: glassConfig.background,
                    borderRadius: RADIUS['2xl'],
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
                  borderRadius: RADIUS['2xl'],
                },
              ]}
            />
          )}

          {/* Content */}
          <View
            style={{
              position: 'relative',
              zIndex: 1,
              padding: COMPONENT_SPACING.modal.padding,
            }}
          >
            {children}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    overflow: 'hidden',
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  centerModal: {
    overflow: 'hidden',
    maxHeight: '80%',
  },
});
