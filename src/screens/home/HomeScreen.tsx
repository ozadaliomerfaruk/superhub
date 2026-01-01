import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Image,
  Animated,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from '../../components/ui/GradientBox';
import * as Haptics from 'expo-haptics';
import {
  Search,
  Bell,
  Plus,
  Home,
  ChevronRight,
  Building2,
  Palmtree,
  Key,
  MapPin,
  TrendingUp,
  BarChart3,
  Shield,
  Sparkles,
  Calendar,
  Zap,
} from 'lucide-react-native';
import { RootStackParamList } from '../../navigation/types';
import { Property, Asset } from '../../types';
import { propertyRepository, expenseRepository, assetRepository, maintenanceRepository } from '../../services/database';
import { getDaysUntil } from '../../utils/date';
import { PressableCard, IconButton, EmptyState, Button, Card } from '../../components/ui';
import { COLORS, PROPERTY_TYPES, SHADOWS } from '../../constants/theme';
import { formatCurrency } from '../../utils/currency';
import { useTheme } from '../../contexts';
import { format } from 'date-fns';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const PropertyTypeIcon = ({ type, size = 24 }: { type: Property['type']; size?: number }) => {
  const color = PROPERTY_TYPES[type]?.color || COLORS.slate[400];
  switch (type) {
    case 'home': return <Home size={size} color={color} />;
    case 'vacation': return <Palmtree size={size} color={color} />;
    case 'office': return <Building2 size={size} color={color} />;
    case 'rental': return <Key size={size} color={color} />;
    default: return <Home size={size} color={color} />;
  }
};

// Animated stat card component
const AnimatedStatCard = ({
  icon,
  label,
  value,
  color,
  delay = 0,
  isDark,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  delay?: number;
  isDark: boolean;
}) => {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        delay,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        delay,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={{
        flex: 1,
        transform: [{ scale: scaleAnim }],
        opacity: opacityAnim,
      }}
    >
      <View
        className={`p-4 rounded-2xl ${isDark ? 'bg-slate-800/80' : 'bg-white'}`}
        style={[SHADOWS.md, { borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}
      >
        <View
          className="w-10 h-10 rounded-xl items-center justify-center mb-3"
          style={{ backgroundColor: `${color}15` }}
        >
          {icon}
        </View>
        <Text
          className={`text-2xl font-bold mb-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {value}
        </Text>
        <Text className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          {label}
        </Text>
      </View>
    </Animated.View>
  );
};

// Quick action button with animation
const QuickActionButton = ({
  icon,
  label,
  colors,
  onPress,
  delay = 0,
}: {
  icon: React.ReactNode;
  label: string;
  colors: [string, string];
  onPress: () => void;
  delay?: number;
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const pressAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      delay,
      friction: 8,
      tension: 50,
      useNativeDriver: true,
    }).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(pressAnim, {
      toValue: 0.95,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressAnim, {
      toValue: 1,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: Animated.multiply(scaleAnim, pressAnim) }] }}>
      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          onPress();
        }}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderRadius: 16,
          }, SHADOWS.md]}
        >
          <View className="w-9 h-9 rounded-xl bg-white/20 items-center justify-center mr-3">
            {icon}
          </View>
          <Text className="text-white font-semibold text-sm flex-1">{label}</Text>
          <ChevronRight size={18} color="rgba(255,255,255,0.7)" />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

export function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const [properties, setProperties] = useState<Property[]>([]);
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [expiringWarranties, setExpiringWarranties] = useState<Asset[]>([]);
  const [pendingTasks, setPendingTasks] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Animations
  const headerAnim = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;

  const loadData = useCallback(async () => {
    try {
      const now = new Date();
      const [propertiesData, monthlyTotalData, warrantiesData] = await Promise.all([
        propertyRepository.getAll(),
        expenseRepository.getMonthlyTotal(now.getFullYear(), now.getMonth() + 1),
        assetRepository.getAllWithExpiringWarranty(30),
      ]);

      // Count pending maintenance tasks
      let taskCount = 0;
      for (const property of propertiesData) {
        const tasks = await maintenanceRepository.getByPropertyId(property.id);
        taskCount += tasks.filter(t => !t.isCompleted).length;
      }

      setProperties(propertiesData);
      setMonthlyTotal(monthlyTotalData);
      setExpiringWarranties(warrantiesData);
      setPendingTasks(taskCount);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
      // Trigger header animation
      Animated.spring(headerAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handlePropertyPress = (property: Property) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    navigation.navigate('PropertyDetail', { propertyId: property.id });
  };

  const handleAddProperty = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    navigation.navigate('AddProperty');
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const totalAlerts = expiringWarranties.length;

  return (
    <View className={`flex-1 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
      {/* Gradient Header Background */}
      <LinearGradient
        colors={isDark
          ? ['#166534', '#15803d', '#0f172a']
          : ['#22c55e', '#16a34a', '#f8fafc']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ paddingTop: insets.top, paddingBottom: 32 }}
      >
        {/* Header */}
        <Animated.View
          className="px-5 pt-4"
          style={{
            opacity: headerAnim,
            transform: [{
              translateY: headerAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-20, 0],
              })
            }]
          }}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <View className="flex-row items-center mb-1">
                <Sparkles size={14} color="rgba(255,255,255,0.8)" />
                <Text className="text-sm font-medium ml-1.5 text-white/80">
                  {greeting()}
                </Text>
              </View>
              <Text className="text-3xl font-bold text-white">
                HomeTrack
              </Text>
            </View>
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => navigation.navigate('Search')}
                className="w-11 h-11 rounded-xl bg-white/20 items-center justify-center"
                activeOpacity={0.7}
              >
                <Search size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigation.navigate('Notifications')}
                className="w-11 h-11 rounded-xl bg-white/20 items-center justify-center relative"
                activeOpacity={0.7}
              >
                <Bell size={20} color="#fff" />
                {totalAlerts > 0 && (
                  <View className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 items-center justify-center border-2 border-white">
                    <Text className="text-[10px] font-bold text-white">{totalAlerts}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Date badge */}
          <View className="flex-row items-center mt-4 bg-white/15 self-start px-3 py-1.5 rounded-full">
            <Calendar size={14} color="rgba(255,255,255,0.9)" />
            <Text className="text-sm font-medium text-white/90 ml-1.5">
              {format(new Date(), 'EEEE, MMMM d')}
            </Text>
          </View>
        </Animated.View>
      </LinearGradient>

      <ScrollView
        className="flex-1 -mt-4"
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#fff"
            progressViewOffset={20}
          />
        }
      >
        {properties.length === 0 && !loading ? (
          <View className={`flex-1 pt-8 mx-5 rounded-3xl ${isDark ? 'bg-slate-800' : 'bg-white'}`} style={SHADOWS.lg}>
            <EmptyState
              icon={<Home size={52} color={COLORS.primary[500]} />}
              title="Welcome to HomeTrack!"
              description="Start by adding your first property to track maintenance, expenses, and keep everything organized"
              actionLabel="Add Your First Property"
              onAction={handleAddProperty}
            />
          </View>
        ) : (
          <View className="px-5">
            {/* Stats Row */}
            {properties.length > 0 && (
              <View className="flex-row gap-3 mb-5">
                <AnimatedStatCard
                  icon={<Home size={20} color={COLORS.primary[600]} />}
                  label="Properties"
                  value={properties.length.toString()}
                  color={COLORS.primary[600]}
                  delay={0}
                  isDark={isDark}
                />
                <AnimatedStatCard
                  icon={<TrendingUp size={20} color={COLORS.info} />}
                  label="This Month"
                  value={formatCurrency(monthlyTotal)}
                  color={COLORS.info}
                  delay={100}
                  isDark={isDark}
                />
              </View>
            )}

            {/* Alerts Section */}
            {(expiringWarranties.length > 0 || pendingTasks > 0) && (
              <View className="mb-5">
                <View className="flex-row items-center mb-3">
                  <Zap size={16} color={COLORS.warning} />
                  <Text className={`text-sm font-bold uppercase tracking-wide ml-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Needs Attention
                  </Text>
                </View>
                <View className={`rounded-2xl overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-white'}`} style={SHADOWS.md}>
                  {/* Warranty Alerts */}
                  {expiringWarranties.length > 0 && (
                    <TouchableOpacity
                      onPress={() => navigation.navigate('AssetDetail', { assetId: expiringWarranties[0].id })}
                      activeOpacity={0.7}
                      className={`flex-row items-center p-4 ${pendingTasks > 0 ? `border-b ${isDark ? 'border-slate-700' : 'border-slate-100'}` : ''}`}
                    >
                      <LinearGradient
                        colors={['#fbbf24', '#f59e0b']}
                        style={{ width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Shield size={22} color="#fff" />
                      </LinearGradient>
                      <View className="flex-1 ml-3">
                        <Text className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          Warranty Expiring
                        </Text>
                        <Text className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {expiringWarranties[0].name} • {expiringWarranties[0].warrantyEndDate ? getDaysUntil(expiringWarranties[0].warrantyEndDate) : 0} days left
                        </Text>
                      </View>
                      <View className="bg-amber-100 px-2.5 py-1 rounded-full">
                        <Text className="text-xs font-bold text-amber-700">{expiringWarranties.length}</Text>
                      </View>
                    </TouchableOpacity>
                  )}

                  {/* Pending Tasks */}
                  {pendingTasks > 0 && (
                    <TouchableOpacity
                      onPress={() => navigation.navigate('AllTasks')}
                      activeOpacity={0.7}
                      className="flex-row items-center p-4"
                    >
                      <LinearGradient
                        colors={['#3b82f6', '#2563eb']}
                        style={{ width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Calendar size={22} color="#fff" />
                      </LinearGradient>
                      <View className="flex-1 ml-3">
                        <Text className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          Pending Tasks
                        </Text>
                        <Text className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {pendingTasks} maintenance task{pendingTasks > 1 ? 's' : ''} to complete
                        </Text>
                      </View>
                      <View className="bg-blue-100 px-2.5 py-1 rounded-full">
                        <Text className="text-xs font-bold text-blue-700">{pendingTasks}</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            {/* Quick Actions */}
            {properties.length > 0 && (
              <View className="mb-5">
                <Text className={`text-sm font-bold uppercase tracking-wide mb-3 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Quick Actions
                </Text>
                <View className="gap-3">
                  <QuickActionButton
                    icon={<BarChart3 size={20} color="#fff" />}
                    label="View Reports"
                    colors={['#3b82f6', '#2563eb']}
                    onPress={() => navigation.navigate('Reports')}
                    delay={0}
                  />
                </View>
              </View>
            )}

            {/* Properties Section */}
            {properties.length > 0 && (
              <View className="mb-4">
                <View className="flex-row items-center justify-between mb-3">
                  <Text className={`text-sm font-bold uppercase tracking-wide ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Your Properties
                  </Text>
                  <TouchableOpacity
                    onPress={handleAddProperty}
                    className="flex-row items-center"
                    activeOpacity={0.7}
                  >
                    <Plus size={16} color={COLORS.primary[600]} />
                    <Text className="text-sm font-semibold text-primary-600 ml-1">Add</Text>
                  </TouchableOpacity>
                </View>

                {/* Properties List */}
                <View className="gap-4">
                  {properties.map((property, index) => (
                    <PropertyCard
                      key={property.id}
                      property={property}
                      onPress={() => handlePropertyPress(property)}
                      isDark={isDark}
                      index={index}
                    />
                  ))}
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// Separate Property Card component with animations
const PropertyCard = ({
  property,
  onPress,
  isDark,
  index,
}: {
  property: Property;
  onPress: () => void;
  isDark: boolean;
  index: number;
}) => {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const pressAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        delay: index * 100,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        delay: index * 100,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(pressAnim, {
      toValue: 0.98,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressAnim, {
      toValue: 1,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const propertyConfig = PROPERTY_TYPES[property.type] || PROPERTY_TYPES.home;

  return (
    <Animated.View
      style={{
        transform: [{ scale: Animated.multiply(scaleAnim, pressAnim) }],
        opacity: opacityAnim,
      }}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <View
          className={`rounded-3xl overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-white'}`}
          style={SHADOWS.lg}
        >
          {/* Image Section */}
          {property.imageUri ? (
            <View className="relative">
              <Image
                source={{ uri: property.imageUri }}
                className="w-full h-44"
                resizeMode="cover"
              />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.6)']}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              />
              <View className="absolute bottom-3 left-4 right-4">
                <Text className="text-white text-xl font-bold" numberOfLines={1}>
                  {property.name}
                </Text>
                <View className="flex-row items-center mt-1">
                  <MapPin size={12} color="rgba(255,255,255,0.8)" />
                  <Text className="text-white/80 text-xs ml-1 flex-1" numberOfLines={1}>
                    {property.address}
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <View className="relative">
              <LinearGradient
                colors={[`${propertyConfig.color}30`, `${propertyConfig.color}10`]}
                style={{ width: '100%', height: 144, alignItems: 'center', justifyContent: 'center' }}
              >
                <View
                  className="w-16 h-16 rounded-2xl items-center justify-center"
                  style={{ backgroundColor: `${propertyConfig.color}25` }}
                >
                  <PropertyTypeIcon type={property.type} size={32} />
                </View>
              </LinearGradient>
              <View className={`px-4 py-3 ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`} numberOfLines={1}>
                  {property.name}
                </Text>
                <View className="flex-row items-center mt-1">
                  <MapPin size={12} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                  <Text className={`text-xs ml-1 flex-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} numberOfLines={1}>
                    {property.address}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Footer */}
          <View className={`flex-row items-center justify-between px-4 py-3 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
            <View
              className="px-3 py-1.5 rounded-xl"
              style={{ backgroundColor: `${propertyConfig.color}15` }}
            >
              <Text
                className="text-xs font-bold"
                style={{ color: propertyConfig.color }}
              >
                {propertyConfig.label}
              </Text>
            </View>
            <View className="flex-row items-center">
              <Text className={`text-sm font-semibold mr-1 ${isDark ? 'text-primary-400' : 'text-primary-600'}`}>
                View Details
              </Text>
              <ChevronRight size={16} color={COLORS.primary[isDark ? 400 : 600]} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};
