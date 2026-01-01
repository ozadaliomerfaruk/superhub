import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ActionSheetIOS,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from '../../components/ui/GradientBox';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  MoreVertical,
  Plus,
  DoorOpen,
  Wrench,
  AlertTriangle,
  Ruler,
  Palette,
  Box,
  Wifi,
  ChevronRight,
  DollarSign,
  TrendingUp,
  Calendar,
  Receipt,
  Clock,
  Package,
  FileText,
  Images,
  RefreshCcw,
  StickyNote,
  Home,
  Sparkles,
  Palmtree,
  Building2,
  Key,
  MapPin,
} from 'lucide-react-native';
import { RootStackParamList } from '../../navigation/types';
import { Property, Room, Expense } from '../../types';
import { propertyRepository, roomRepository, expenseRepository } from '../../services/database';
import { IconButton, PressableCard, Button } from '../../components/ui';
import { COLORS, ROOM_TYPES, PROPERTY_TYPES, SHADOWS } from '../../constants/theme';
import { formatCurrency } from '../../utils/currency';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { useTheme } from '../../contexts';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type PropertyDetailRouteProp = RouteProp<RootStackParamList, 'PropertyDetail'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Quick action data
const quickActions = [
  { key: 'emergency', label: 'Emergency', icon: AlertTriangle, colors: ['#ef4444', '#dc2626'], screen: 'Emergency' },
  { key: 'paint', label: 'Paint', icon: Palette, colors: ['#a855f7', '#9333ea'], screen: 'PaintCodes' },
  { key: 'measure', label: 'Measure', icon: Ruler, colors: ['#3b82f6', '#2563eb'], screen: 'Measurements' },
  { key: 'storage', label: 'Storage', icon: Box, colors: ['#f59e0b', '#d97706'], screen: 'StorageBoxes' },
  { key: 'wifi', label: 'WiFi', icon: Wifi, colors: ['#06b6d4', '#0891b2'], screen: 'WiFiInfo' },
  { key: 'tasks', label: 'Tasks', icon: Wrench, colors: ['#14b8a6', '#0d9488'], screen: 'Maintenance' },
  { key: 'expense', label: 'Expense', icon: DollarSign, colors: ['#22c55e', '#16a34a'], screen: 'AddExpense' },
  { key: 'asset', label: 'Assets', icon: Package, colors: ['#ec4899', '#db2777'], screen: 'PropertyAssets' },
  { key: 'docs', label: 'Docs', icon: FileText, colors: ['#6366f1', '#4f46e5'], screen: 'Documents' },
  { key: 'renovate', label: 'Renovate', icon: Images, colors: ['#c026d3', '#a21caf'], screen: 'Renovations' },
  { key: 'bills', label: 'Bills', icon: RefreshCcw, colors: ['#ea580c', '#c2410c'], screen: 'BillTemplates' },
  { key: 'notes', label: 'Notes', icon: StickyNote, colors: ['#ca8a04', '#a16207'], screen: 'Notes' },
];

// Animated Quick Action Button
const QuickActionItem = ({
  action,
  onPress,
  index,
}: {
  action: typeof quickActions[0];
  onPress: () => void;
  index: number;
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const pressAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      delay: index * 30,
      friction: 8,
      tension: 50,
      useNativeDriver: true,
    }).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(pressAnim, {
      toValue: 0.92,
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

  const IconComponent = action.icon;

  return (
    <Animated.View
      style={{
        transform: [{ scale: Animated.multiply(scaleAnim, pressAnim) }],
        width: (SCREEN_WIDTH - 60) / 4,
      }}
    >
      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        className="items-center py-3"
      >
        <LinearGradient
          colors={action.colors as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[{ width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }, SHADOWS.md]}
        >
          <IconComponent size={22} color="#fff" />
        </LinearGradient>
        <Text className="text-xs font-semibold text-slate-600 dark:text-slate-400">
          {action.label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Helper function to get property type icon
const getPropertyTypeIcon = (type: Property['type'] | undefined, size: number = 48, color: string) => {
  switch (type) {
    case 'home': return <Home size={size} color={color} />;
    case 'vacation': return <Palmtree size={size} color={color} />;
    case 'office': return <Building2 size={size} color={color} />;
    case 'rental': return <Key size={size} color={color} />;
    case 'other': return <MapPin size={size} color={color} />;
    default: return <Home size={size} color={color} />;
  }
};

export function PropertyDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<PropertyDetailRouteProp>();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();

  const [property, setProperty] = useState<Property | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Animations
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const loadData = useCallback(async () => {
    try {
      const now = new Date();
      const [propertyData, roomsData, expensesData, monthlyTotalData, totalData] = await Promise.all([
        propertyRepository.getById(route.params.propertyId),
        roomRepository.getByPropertyId(route.params.propertyId),
        expenseRepository.getByPropertyId(route.params.propertyId, 5),
        expenseRepository.getMonthlyTotalByPropertyId(
          route.params.propertyId,
          now.getFullYear(),
          now.getMonth() + 1
        ),
        expenseRepository.getTotalByPropertyId(route.params.propertyId),
      ]);
      setProperty(propertyData);
      setRooms(roomsData);
      setRecentExpenses(expensesData);
      setMonthlyTotal(monthlyTotalData);
      setTotalSpent(totalData);
    } catch (error) {
      console.error('Failed to load property:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [route.params.propertyId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleMoreOptions = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Edit Property', 'Delete Property'],
          destructiveButtonIndex: 2,
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            navigation.navigate('EditProperty', { propertyId: property!.id });
          } else if (buttonIndex === 2) {
            handleDelete();
          }
        }
      );
    } else {
      Alert.alert('Property Options', 'Choose an action', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Edit Property',
          onPress: () => navigation.navigate('EditProperty', { propertyId: property!.id }),
        },
        { text: 'Delete Property', style: 'destructive', onPress: handleDelete },
      ]);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Property',
      'Are you sure you want to delete this property? This will also delete all rooms, assets, and expenses associated with it. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await propertyRepository.delete(property!.id);
              navigation.goBack();
            } catch (error) {
              console.error('Failed to delete property:', error);
              Alert.alert('Error', 'Failed to delete property. Please try again.');
            }
          },
        },
      ]
    );
  };

  const formatExpenseDate = (dateString: string) => {
    const date = parseISO(dateString);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM d');
  };

  const getExpenseIcon = (type: Expense['type']) => {
    switch (type) {
      case 'repair': return <Wrench size={16} color={COLORS.categories.maintenance} />;
      case 'bill': return <Receipt size={16} color={COLORS.primary[600]} />;
      case 'maintenance': return <Clock size={16} color={COLORS.info} />;
      case 'purchase': return <Package size={16} color={COLORS.secondary[600]} />;
      default: return <DollarSign size={16} color={COLORS.slate[500]} />;
    }
  };

  const handleQuickAction = (action: typeof quickActions[0]) => {
    const params = { propertyId: property!.id };
    navigation.navigate(action.screen as any, params);
  };

  if (!property && !loading) {
    return (
      <View className={`flex-1 items-center justify-center ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
        <Text className={isDark ? 'text-slate-400' : 'text-slate-500'}>Property not found</Text>
      </View>
    );
  }

  const propertyConfig = PROPERTY_TYPES[property?.type || 'home'];

  return (
    <View className={`flex-1 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
      {/* Fixed Header (appears on scroll) */}
      <Animated.View
        className="absolute top-0 left-0 right-0 z-10"
        style={{
          opacity: headerOpacity,
          paddingTop: insets.top,
        }}
      >
        <LinearGradient
          colors={isDark ? ['#0f172a', '#0f172aee'] : ['#ffffff', '#ffffffee']}
          style={{ paddingHorizontal: 16, paddingBottom: 12, paddingTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <IconButton
            icon={<ArrowLeft size={22} color={isDark ? '#fff' : COLORS.slate[900]} />}
            variant="ghost"
            onPress={() => navigation.goBack()}
          />
          <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`} numberOfLines={1}>
            {property?.name}
          </Text>
          <IconButton
            icon={<MoreVertical size={22} color={isDark ? '#fff' : COLORS.slate[900]} />}
            variant="ghost"
            onPress={handleMoreOptions}
          />
        </LinearGradient>
      </Animated.View>

      {/* Header Image */}
      <View className="relative">
        {property?.imageUri ? (
          <Image
            source={{ uri: property.imageUri }}
            className="w-full h-72"
            resizeMode="cover"
          />
        ) : (
          <LinearGradient
            colors={[`${propertyConfig?.color}40`, `${propertyConfig?.color}20`]}
            style={{ width: '100%', height: 288 }}
          >
            <View className="flex-1 items-center justify-center">
              <View
                className="w-24 h-24 rounded-3xl items-center justify-center"
                style={{ backgroundColor: `${propertyConfig?.color}30` }}
              >
                {getPropertyTypeIcon(property?.type, 48, propertyConfig?.color || COLORS.slate[400])}
              </View>
            </View>
          </LinearGradient>
        )}

        {/* Gradient Overlay */}
        <LinearGradient
          colors={['rgba(0,0,0,0.4)', 'transparent', 'transparent', isDark ? '#0f172a' : '#f8fafc']}
          locations={[0, 0.3, 0.7, 1]}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />

        {/* Overlay Header */}
        <View
          className="absolute top-0 left-0 right-0 flex-row items-center justify-between px-4"
          style={{ paddingTop: insets.top + 8 }}
        >
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="w-10 h-10 rounded-xl bg-black/30 items-center justify-center"
            activeOpacity={0.7}
          >
            <ArrowLeft size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleMoreOptions}
            className="w-10 h-10 rounded-xl bg-black/30 items-center justify-center"
            activeOpacity={0.7}
          >
            <MoreVertical size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <Animated.ScrollView
        className="flex-1 -mt-16"
        contentContainerStyle={{ paddingBottom: 100 }}
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
            tintColor={COLORS.primary[600]}
            progressViewOffset={60}
          />
        }
      >
        {/* Property Info Card */}
        <View
          className={`mx-4 rounded-3xl p-5 ${isDark ? 'bg-slate-800' : 'bg-white'}`}
          style={SHADOWS.lg}
        >
          <View className="flex-row items-start justify-between">
            <View className="flex-1 mr-3">
              <Text className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`} numberOfLines={2}>
                {property?.name}
              </Text>
              <Text className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} numberOfLines={2}>
                {property?.address}
              </Text>
            </View>
            <View
              className="px-3 py-1.5 rounded-xl"
              style={{ backgroundColor: `${propertyConfig?.color}15` }}
            >
              <Text className="text-xs font-bold" style={{ color: propertyConfig?.color }}>
                {propertyConfig?.label}
              </Text>
            </View>
          </View>

          {/* Quick Stats */}
          <View className={`flex-row mt-6 pt-5 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
            <View className="flex-1 items-center">
              <View className="flex-row items-center">
                <DoorOpen size={18} color={isDark ? COLORS.slate[400] : COLORS.slate[500]} />
                <Text className={`text-2xl font-bold ml-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {rooms.length}
                </Text>
              </View>
              <Text className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Rooms</Text>
            </View>
            <View className={`w-px ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`} />
            <View className="flex-1 items-center">
              <View className="flex-row items-center">
                <TrendingUp size={18} color={COLORS.primary[500]} />
                <Text className="text-2xl font-bold text-primary-500 ml-2">
                  {formatCurrency(monthlyTotal)}
                </Text>
              </View>
              <Text className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>This Month</Text>
            </View>
            <View className={`w-px ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`} />
            <View className="flex-1 items-center">
              <View className="flex-row items-center">
                <DollarSign size={18} color={isDark ? COLORS.slate[400] : COLORS.slate[500]} />
                <Text className={`text-2xl font-bold ml-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {formatCurrency(totalSpent)}
                </Text>
              </View>
              <Text className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>All Time</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions Grid */}
        <View className="mx-4 mt-6">
          <View className="flex-row items-center mb-4">
            <Sparkles size={16} color={COLORS.secondary[500]} />
            <Text className={`text-sm font-bold uppercase tracking-wide ml-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Quick Actions
            </Text>
          </View>
          <View
            className={`rounded-3xl p-3 ${isDark ? 'bg-slate-800' : 'bg-white'}`}
            style={SHADOWS.md}
          >
            <View className="flex-row flex-wrap">
              {quickActions.map((action, index) => (
                <QuickActionItem
                  key={action.key}
                  action={action}
                  onPress={() => handleQuickAction(action)}
                  index={index}
                />
              ))}
            </View>
          </View>
        </View>

        {/* Rooms Section */}
        <View className="mx-4 mt-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className={`text-sm font-bold uppercase tracking-wide ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Rooms ({rooms.length})
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('AddRoom', { propertyId: property!.id })}
              className="flex-row items-center"
              activeOpacity={0.7}
            >
              <Plus size={16} color={COLORS.primary[600]} />
              <Text className="text-sm font-semibold text-primary-600 ml-1">Add</Text>
            </TouchableOpacity>
          </View>

          {rooms.length === 0 ? (
            <View
              className={`rounded-2xl p-6 items-center ${isDark ? 'bg-slate-800' : 'bg-white'}`}
              style={SHADOWS.sm}
            >
              <LinearGradient
                colors={[COLORS.slate[100], COLORS.slate[50]]}
                style={{ width: 64, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}
              >
                <DoorOpen size={28} color={COLORS.slate[400]} />
              </LinearGradient>
              <Text className={`text-base font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                No rooms yet
              </Text>
              <Text className={`text-sm text-center mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Add rooms to organize your assets and track expenses by area
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('AddRoom', { propertyId: property!.id })}
                className="mt-4"
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={[COLORS.primary[500], COLORS.primary[600]]}
                  style={{ paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, flexDirection: 'row', alignItems: 'center' }}
                >
                  <Plus size={16} color="#fff" />
                  <Text className="text-white font-semibold ml-1.5">Add First Room</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="gap-3">
              {rooms.map((room, index) => {
                const roomConfig = ROOM_TYPES[room.type] || ROOM_TYPES.other;
                return (
                  <RoomCard
                    key={room.id}
                    room={room}
                    roomConfig={roomConfig}
                    isDark={isDark}
                    index={index}
                    onPress={() =>
                      navigation.navigate('RoomDetail', {
                        roomId: room.id,
                        propertyId: property!.id,
                      })
                    }
                  />
                );
              })}
            </View>
          )}
        </View>

        {/* Recent Expenses Section */}
        <View className="mx-4 mt-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className={`text-sm font-bold uppercase tracking-wide ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Recent Expenses
            </Text>
            {recentExpenses.length > 0 && (
              <TouchableOpacity
                onPress={() => navigation.navigate('PropertyExpenses', { propertyId: property!.id })}
                className="flex-row items-center"
                activeOpacity={0.7}
              >
                <Text className="text-sm font-semibold text-primary-600">See All</Text>
              </TouchableOpacity>
            )}
          </View>

          {recentExpenses.length === 0 ? (
            <View
              className={`rounded-2xl p-6 items-center ${isDark ? 'bg-slate-800' : 'bg-white'}`}
              style={SHADOWS.sm}
            >
              <LinearGradient
                colors={[COLORS.primary[100], COLORS.primary[50]]}
                style={{ width: 64, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}
              >
                <DollarSign size={28} color={COLORS.primary[500]} />
              </LinearGradient>
              <Text className={`text-base font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                No expenses yet
              </Text>
              <Text className={`text-sm text-center mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Track repairs, bills, and purchases for this property
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('AddExpense', { propertyId: property!.id })}
                className="mt-4"
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={[COLORS.primary[500], COLORS.primary[600]]}
                  style={{ paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, flexDirection: 'row', alignItems: 'center' }}
                >
                  <Plus size={16} color="#fff" />
                  <Text className="text-white font-semibold ml-1.5">Add First Expense</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <View
              className={`rounded-2xl overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-white'}`}
              style={SHADOWS.md}
            >
              {recentExpenses.map((expense, index) => (
                <TouchableOpacity
                  key={expense.id}
                  onPress={() => navigation.navigate('ExpenseDetail', { expenseId: expense.id })}
                  activeOpacity={0.7}
                  className={`flex-row items-center px-4 py-3.5 ${
                    index < recentExpenses.length - 1
                      ? `border-b ${isDark ? 'border-slate-700' : 'border-slate-100'}`
                      : ''
                  }`}
                >
                  <View
                    className="w-10 h-10 rounded-xl items-center justify-center"
                    style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : COLORS.slate[100] }}
                  >
                    {getExpenseIcon(expense.type)}
                  </View>
                  <View className="flex-1 ml-3">
                    <Text
                      className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}
                      numberOfLines={1}
                    >
                      {expense.description}
                    </Text>
                    <Text className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      {expense.category} • {formatExpenseDate(expense.date)}
                    </Text>
                  </View>
                  <Text className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {formatCurrency(expense.amount)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Property Created Footer */}
        {property && (
          <View className="mx-4 mt-8 flex-row items-center justify-center">
            <Calendar size={14} color={isDark ? COLORS.slate[600] : COLORS.slate[400]} />
            <Text className={`text-xs ml-1.5 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
              Added {format(parseISO(property.createdAt), 'MMMM d, yyyy')}
            </Text>
          </View>
        )}
      </Animated.ScrollView>
    </View>
  );
}

// Animated Room Card Component
const RoomCard = ({
  room,
  roomConfig,
  isDark,
  index,
  onPress,
}: {
  room: Room;
  roomConfig: { label: string; icon: string; color: string };
  isDark: boolean;
  index: number;
  onPress: () => void;
}) => {
  const translateX = useRef(new Animated.Value(30)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const pressAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: 0,
        delay: index * 60,
        friction: 8,
        tension: 50,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        delay: index * 60,
        duration: 250,
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

  return (
    <Animated.View
      style={{
        transform: [{ translateX }, { scale: pressAnim }],
        opacity,
      }}
    >
      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <View
          className={`flex-row items-center p-4 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white'}`}
          style={SHADOWS.sm}
        >
          {room.imageUri ? (
            <Image
              source={{ uri: room.imageUri }}
              className="w-14 h-14 rounded-xl"
              resizeMode="cover"
            />
          ) : (
            <View
              className="w-14 h-14 rounded-xl items-center justify-center"
              style={{ backgroundColor: `${roomConfig.color}15` }}
            >
              <DoorOpen size={24} color={roomConfig.color} />
            </View>
          )}
          <View className="flex-1 ml-3">
            <Text className={`text-base font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {room.name}
            </Text>
            <View className="flex-row items-center mt-1">
              <View
                className="px-2 py-0.5 rounded-md"
                style={{ backgroundColor: `${roomConfig.color}15` }}
              >
                <Text className="text-xs font-medium" style={{ color: roomConfig.color }}>
                  {roomConfig.label}
                </Text>
              </View>
            </View>
          </View>
          <ChevronRight size={20} color={isDark ? COLORS.slate[600] : COLORS.slate[400]} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};
