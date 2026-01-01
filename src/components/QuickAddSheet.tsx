import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import {
  X,
  Home,
  DoorOpen,
  Package,
  DollarSign,
  Users,
  Wrench,
} from 'lucide-react-native';
import { RootStackParamList } from '../navigation/types';
import { Property } from '../types';
import { propertyRepository } from '../services/database';
import { useTheme, useTranslation } from '../contexts';
import {
  COLORS,
  getModalGlass,
  getGlassShadow,
  supportsBlur,
  RADIUS,
  SPRING,
  DURATION,
  BlurViewWrapper,
  isBlurAvailable,
} from '../design-system';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface QuickAddSheetProps {
  visible: boolean;
  onClose: () => void;
}

interface QuickAction {
  id: string;
  icon: React.ReactNode;
  labelKey: string;
  color: string;
  bgColorLight: string;
  bgColorDark: string;
  onPress: (navigation: NavigationProp, propertyId?: string) => void;
  requiresProperty?: boolean;
}

const quickActions: QuickAction[] = [
  {
    id: 'property',
    icon: <Home size={24} color="#22c55e" />,
    labelKey: 'quickAdd.property',
    color: '#22c55e',
    bgColorLight: '#f0fdf4',
    bgColorDark: 'rgba(34, 197, 94, 0.2)',
    onPress: (navigation) => navigation.navigate('AddProperty'),
  },
  {
    id: 'room',
    icon: <DoorOpen size={24} color="#3b82f6" />,
    labelKey: 'quickAdd.room',
    color: '#3b82f6',
    bgColorLight: '#eff6ff',
    bgColorDark: 'rgba(59, 130, 246, 0.2)',
    onPress: (navigation, propertyId) => {
      if (propertyId) navigation.navigate('AddRoom', { propertyId });
    },
    requiresProperty: true,
  },
  {
    id: 'expense',
    icon: <DollarSign size={24} color="#8b5cf6" />,
    labelKey: 'quickAdd.expense',
    color: '#8b5cf6',
    bgColorLight: '#f5f3ff',
    bgColorDark: 'rgba(139, 92, 246, 0.2)',
    onPress: (navigation, propertyId) => {
      if (propertyId) navigation.navigate('AddExpense', { propertyId });
    },
    requiresProperty: true,
  },
  {
    id: 'asset',
    icon: <Package size={24} color="#ec4899" />,
    labelKey: 'quickAdd.asset',
    color: '#ec4899',
    bgColorLight: '#fdf2f8',
    bgColorDark: 'rgba(236, 72, 153, 0.2)',
    onPress: (navigation, propertyId) => {
      if (propertyId) navigation.navigate('AddAsset', { propertyId });
    },
    requiresProperty: true,
  },
  {
    id: 'worker',
    icon: <Users size={24} color="#f97316" />,
    labelKey: 'quickAdd.worker',
    color: '#f97316',
    bgColorLight: '#fff7ed',
    bgColorDark: 'rgba(249, 115, 22, 0.2)',
    onPress: (navigation) => navigation.navigate('AddWorker'),
  },
  {
    id: 'maintenance',
    icon: <Wrench size={24} color="#14b8a6" />,
    labelKey: 'quickAdd.task',
    color: '#14b8a6',
    bgColorLight: '#f0fdfa',
    bgColorDark: 'rgba(20, 184, 166, 0.2)',
    onPress: (navigation, propertyId) => {
      if (propertyId) navigation.navigate('Maintenance', { propertyId });
    },
    requiresProperty: true,
  },
];

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export function QuickAddSheet({ visible, onClose }: QuickAddSheetProps) {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Glass config
  const glassConfig = getModalGlass(isDark);
  const shadow = getGlassShadow('modal', isDark);
  const canBlur = supportsBlur() && isBlurAvailable();

  // Fallback background
  const fallbackBackground = isDark ? '#1e293b' : '#ffffff';

  const loadProperties = useCallback(async () => {
    try {
      const data = await propertyRepository.getAll();
      setProperties(data);
      if (data.length > 0 && !selectedProperty) {
        setSelectedProperty(data[0]);
      }
    } catch (error) {
      console.error('Failed to load properties:', error);
    }
  }, [selectedProperty]);

  useEffect(() => {
    if (visible) {
      loadProperties();
      // Animate in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: DURATION.normal,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: SPRING.default.damping,
          stiffness: SPRING.default.stiffness,
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
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, loadProperties, fadeAnim, slideAnim]);

  const handleActionPress = (action: QuickAction) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onClose();
    setTimeout(() => {
      if (action.requiresProperty && !selectedProperty) {
        // If no property exists, prompt to create one first
        navigation.navigate('AddProperty');
      } else {
        action.onPress(navigation, selectedProperty?.id);
      }
    }, 200);
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View className="flex-1">
        {/* Backdrop */}
        <Animated.View
          style={[{ opacity: fadeAnim }, { backgroundColor: glassConfig.overlayColor }]}
          className="absolute inset-0"
        >
          <TouchableWithoutFeedback onPress={handleClose}>
            <View className="flex-1" />
          </TouchableWithoutFeedback>
        </Animated.View>

        {/* Sheet */}
        <Animated.View
          style={[
            {
              transform: [{ translateY: slideAnim }],
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

          {/* Header */}
          <View
            className={`flex-row items-center justify-between px-5 py-3 border-b ${isDark ? 'border-slate-700/50' : 'border-slate-200/50'}`}
            style={{ position: 'relative', zIndex: 1 }}
          >
            <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('quickAdd.title')}</Text>
            <TouchableOpacity
              onPress={handleClose}
              className={`w-8 h-8 rounded-full items-center justify-center ${isDark ? 'bg-slate-700/50' : 'bg-slate-100/80'}`}
              activeOpacity={0.7}
            >
              <X size={18} color={isDark ? COLORS.slate[400] : COLORS.slate[600]} />
            </TouchableOpacity>
          </View>

          {/* Property Selector */}
          {properties.length > 0 && (
            <View
              className={`px-5 py-3 border-b ${isDark ? 'border-slate-700/50' : 'border-slate-200/50'}`}
              style={{ position: 'relative', zIndex: 1 }}
            >
              <Text className={`text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {t('quickAdd.selectProperty')}
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {properties.map((property) => (
                  <TouchableOpacity
                    key={property.id}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setSelectedProperty(property);
                    }}
                    activeOpacity={0.7}
                    className={`px-4 py-2 rounded-xl border-2 ${
                      selectedProperty?.id === property.id
                        ? isDark ? 'border-primary-500 bg-primary-900/30' : 'border-primary-500 bg-primary-50'
                        : isDark ? 'border-slate-600/50 bg-slate-700/50' : 'border-slate-200/80 bg-white/80'
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        selectedProperty?.id === property.id
                          ? isDark ? 'text-primary-400' : 'text-primary-700'
                          : isDark ? 'text-slate-300' : 'text-slate-700'
                      }`}
                      numberOfLines={1}
                    >
                      {property.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Quick Actions Grid */}
          <View
            className="px-5 py-4"
            style={{ paddingBottom: insets.bottom + 16, position: 'relative', zIndex: 1 }}
          >
            <View className="flex-row flex-wrap justify-between">
              {quickActions.map((action) => {
                const isDisabled = action.requiresProperty && properties.length === 0;
                return (
                  <TouchableOpacity
                    key={action.id}
                    onPress={() => !isDisabled && handleActionPress(action)}
                    activeOpacity={isDisabled ? 1 : 0.7}
                    className="w-[30%] items-center mb-4"
                    style={{ opacity: isDisabled ? 0.5 : 1 }}
                  >
                    <View
                      className="w-16 h-16 rounded-2xl items-center justify-center mb-2"
                      style={{ backgroundColor: isDark ? action.bgColorDark : action.bgColorLight }}
                    >
                      {action.icon}
                    </View>
                    <Text className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      {t(action.labelKey)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {properties.length === 0 && (
              <View className={`mt-2 p-4 rounded-xl border ${isDark ? 'bg-amber-900/30 border-amber-800/50' : 'bg-amber-50 border-amber-100'}`}>
                <Text className={`text-sm text-center ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>
                  {t('quickAdd.addPropertyFirst')}
                </Text>
              </View>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
