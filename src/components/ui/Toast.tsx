import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, TouchableOpacity } from 'react-native';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/theme';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  visible: boolean;
  message: string;
  type?: ToastType;
  duration?: number;
  onDismiss: () => void;
}

export function Toast({
  visible,
  message,
  type = 'success',
  duration = 3000,
  onDismiss,
}: ToastProps) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      const timeout = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timeout);
    }
  }, [visible, duration]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  if (!visible) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          bgColor: 'bg-green-500',
          icon: <CheckCircle2 size={20} color="#ffffff" />,
        };
      case 'error':
        return {
          bgColor: 'bg-red-500',
          icon: <AlertCircle size={20} color="#ffffff" />,
        };
      case 'info':
        return {
          bgColor: 'bg-blue-500',
          icon: <Info size={20} color="#ffffff" />,
        };
    }
  };

  const { bgColor, icon } = getTypeStyles();

  return (
    <Animated.View
      className={`absolute left-4 right-4 z-50 ${bgColor} rounded-2xl shadow-lg`}
      style={{
        top: insets.top + 8,
        transform: [{ translateY }],
        opacity,
      }}
    >
      <View className="flex-row items-center px-4 py-3">
        {icon}
        <Text className="flex-1 text-white font-medium text-base ml-3">
          {message}
        </Text>
        <TouchableOpacity onPress={hideToast} activeOpacity={0.7}>
          <X size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}
