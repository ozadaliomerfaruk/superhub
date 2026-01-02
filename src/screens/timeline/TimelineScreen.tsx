import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from '../../components/ui/GradientBox';
import * as Haptics from 'expo-haptics';
import {
  Clock,
  Wrench,
  Receipt,
  Package,
  FileText,
  CheckCircle2,
  Calendar,
  DollarSign,
  Settings,
  TrendingUp,
  AlertCircle,
  ChevronRight,
  ListFilter,
} from 'lucide-react-native';
import { EmptyState, Card, Badge } from '../../components/ui';
import { COLORS, EXPENSE_TYPES } from '../../constants/theme';
import { expenseRepository, maintenanceRepository, propertyRepository } from '../../services/database';
import { Expense, MaintenanceTask, ExpenseType } from '../../types';
import { RootStackParamList } from '../../navigation/types';
import { formatCurrency } from '../../utils/currency';
import { format, isToday, isYesterday, isThisWeek, isThisMonth, isFuture } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useTheme, useTranslation } from '../../contexts';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type FilterType = 'all' | 'expense' | 'maintenance' | 'upcoming' | 'overdue';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface TimelineItem {
  id: string;
  type: 'expense' | 'maintenance';
  date: string;
  title: string;
  subtitle?: string;
  amount?: number;
  expenseType?: ExpenseType;
  maintenanceStatus?: 'upcoming' | 'due_soon' | 'overdue' | 'completed';
  propertyId?: string;
  propertyName?: string;
}

interface GroupedItems {
  [key: string]: TimelineItem[];
}

const getExpenseIcon = (type: string) => {
  switch (type) {
    case 'repair': return <Wrench size={18} color={COLORS.categories.repair} />;
    case 'bill': return <Receipt size={18} color={COLORS.categories.bill} />;
    case 'maintenance': return <Wrench size={18} color={COLORS.categories.maintenance} />;
    case 'purchase': return <Package size={18} color={COLORS.info} />;
    default: return <FileText size={18} color={COLORS.slate[500]} />;
  }
};

const formatDateHeader = (dateStr: string, locale: any, t: any): string => {
  const date = new Date(dateStr);
  if (isToday(date)) return t('dates.today');
  if (isYesterday(date)) return t('dates.yesterday');
  if (isThisWeek(date)) return format(date, 'EEEE', { locale });
  if (isThisMonth(date)) return format(date, 'MMMM d', { locale });
  return format(date, 'MMMM d, yyyy', { locale });
};

// Animated filter chip component
const FilterChip = ({
  tab,
  isActive,
  onPress,
  isDark,
}: {
  tab: { key: FilterType; label: string; icon: React.ReactNode; color: string };
  isActive: boolean;
  onPress: () => void;
  isDark: boolean;
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        {isActive ? (
          <LinearGradient
            colors={[tab.color, adjustColor(tab.color, -20)]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 9999 }}
          >
            {React.cloneElement(tab.icon as React.ReactElement<{ color?: string }>, { color: '#fff' })}
            <Text className="text-sm font-semibold text-white ml-1.5">{tab.label}</Text>
          </LinearGradient>
        ) : (
          <View
            className={`flex-row items-center px-4 py-2.5 rounded-full ${
              isDark ? 'bg-slate-800' : 'bg-white'
            }`}
            style={{
              borderWidth: 1,
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
            }}
          >
            {React.cloneElement(tab.icon as React.ReactElement<{ color?: string }>, {
              color: isDark ? COLORS.slate[400] : COLORS.slate[500],
            })}
            <Text className={`text-sm font-medium ml-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              {tab.label}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

// Helper to darken/lighten colors
function adjustColor(color: string, amount: number): string {
  const hex = color.replace('#', '');
  const r = Math.max(0, Math.min(255, parseInt(hex.substring(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hex.substring(2, 4), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hex.substring(4, 6), 16) + amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Animated timeline item
const TimelineItemCard = ({
  item,
  onPress,
  isDark,
  index,
  t,
}: {
  item: TimelineItem;
  onPress: () => void;
  isDark: boolean;
  index: number;
  t: any;
}) => {
  const translateX = useRef(new Animated.Value(30)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const pressAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animations = Animated.parallel([
      Animated.spring(translateX, {
        toValue: 0,
        delay: index * 50,
        friction: 8,
        tension: 50,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        delay: index * 50,
        duration: 250,
        useNativeDriver: true,
      }),
    ]);

    animations.start();

    // Cleanup: stop animations when component unmounts
    return () => {
      animations.stop();
    };
  }, [index, translateX, opacity]);

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

  const getMaintenanceStatusColor = (status: TimelineItem['maintenanceStatus']) => {
    switch (status) {
      case 'overdue': return COLORS.error;
      case 'due_soon': return COLORS.warning;
      case 'completed': return COLORS.success;
      default: return COLORS.info;
    }
  };

  const getMaintenanceStatusLabel = (status: TimelineItem['maintenanceStatus']) => {
    switch (status) {
      case 'overdue': return t('maintenance.status.overdue');
      case 'due_soon': return t('maintenance.status.dueSoon');
      case 'completed': return t('maintenance.status.completed');
      default: return t('maintenance.status.upcoming');
    }
  };

  const statusColor = item.type === 'expense'
    ? EXPENSE_TYPES[item.expenseType || 'other']?.color || COLORS.slate[400]
    : getMaintenanceStatusColor(item.maintenanceStatus);

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
          className={`p-4 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white'}`}
          style={{
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.3 : 0.08,
            shadowRadius: 8,
            elevation: 3,
          }}
        >
          <View className="flex-row items-start">
            {/* Icon */}
            <View
              className="w-11 h-11 rounded-xl items-center justify-center"
              style={{ backgroundColor: `${statusColor}15` }}
            >
              {item.type === 'expense' ? (
                getExpenseIcon(item.expenseType || 'other')
              ) : (
                <Settings size={20} color={statusColor} />
              )}
            </View>

            {/* Content */}
            <View className="flex-1 ml-3">
              <View className="flex-row items-start justify-between">
                <View className="flex-1 mr-2">
                  <Text
                    className={`text-base font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  <View className="flex-row items-center flex-wrap mt-1.5 gap-2">
                    {item.type === 'expense' ? (
                      <View
                        className="px-2 py-0.5 rounded-md"
                        style={{ backgroundColor: `${statusColor}15` }}
                      >
                        <Text className="text-xs font-semibold" style={{ color: statusColor }}>
                          {t(`expense.types.${item.expenseType || 'other'}`)}
                        </Text>
                      </View>
                    ) : (
                      <View
                        className="px-2 py-0.5 rounded-md"
                        style={{ backgroundColor: `${statusColor}15` }}
                      >
                        <Text className="text-xs font-semibold" style={{ color: statusColor }}>
                          {getMaintenanceStatusLabel(item.maintenanceStatus)}
                        </Text>
                      </View>
                    )}
                    {item.propertyName && (
                      <Text className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        {item.propertyName}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Amount or Chevron */}
                {item.type === 'expense' && item.amount !== undefined ? (
                  <View className="items-end">
                    <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {formatCurrency(item.amount)}
                    </Text>
                  </View>
                ) : (
                  <ChevronRight size={20} color={isDark ? COLORS.slate[600] : COLORS.slate[400]} />
                )}
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export function TimelineScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const { t, language } = useTranslation();
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  // Header animation
  const headerAnim = useRef(new Animated.Value(0)).current;

  // Get date-fns locale
  const dateLocale = language === 'tr' ? tr : undefined;

  // Dynamic filter tabs with translations
  const filterTabs: { key: FilterType; label: string; icon: React.ReactNode; color: string }[] = [
    { key: 'all', label: t('timeline.filters.all'), icon: <ListFilter size={16} />, color: COLORS.slate[600] },
    { key: 'expense', label: t('timeline.filters.expenses'), icon: <DollarSign size={16} />, color: COLORS.primary[600] },
    { key: 'maintenance', label: t('timeline.filters.tasks'), icon: <Settings size={16} />, color: COLORS.info },
    { key: 'upcoming', label: t('timeline.filters.upcoming'), icon: <Calendar size={16} />, color: COLORS.secondary[600] },
    { key: 'overdue', label: t('timeline.filters.overdue'), icon: <AlertCircle size={16} />, color: COLORS.error },
  ];

  const loadData = useCallback(async () => {
    try {
      const properties = await propertyRepository.getAll();
      const propertyMap = new Map(properties.map(p => [p.id, p.name]));

      // Load expenses
      const allExpenses = await expenseRepository.getAll();
      const expenseItems: TimelineItem[] = allExpenses.map(expense => ({
        id: expense.id,
        type: 'expense' as const,
        date: expense.date,
        title: expense.description,
        subtitle: expense.category,
        amount: expense.amount,
        expenseType: expense.type,
        propertyId: expense.propertyId,
        propertyName: propertyMap.get(expense.propertyId),
      }));

      // Load maintenance tasks
      const allTasks: MaintenanceTask[] = [];
      for (const property of properties) {
        const tasks = await maintenanceRepository.getByPropertyId(property.id);
        allTasks.push(...tasks);
      }

      const now = new Date();
      const maintenanceItems: TimelineItem[] = allTasks.map(task => {
        const dueDate = new Date(task.nextDueDate);
        const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        let status: TimelineItem['maintenanceStatus'] = 'upcoming';
        if (task.isCompleted) status = 'completed';
        else if (daysUntilDue < 0) status = 'overdue';
        else if (daysUntilDue <= task.reminderDaysBefore) status = 'due_soon';

        return {
          id: task.id,
          type: 'maintenance' as const,
          date: task.nextDueDate,
          title: task.title,
          subtitle: task.description,
          maintenanceStatus: status,
          propertyId: task.propertyId,
          propertyName: propertyMap.get(task.propertyId),
        };
      });

      setItems([...expenseItems, ...maintenanceItems]);
    } catch (error) {
      console.error('Failed to load timeline:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
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

  const filteredItems = items.filter((item) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'expense') return item.type === 'expense';
    if (activeFilter === 'maintenance') return item.type === 'maintenance';
    if (activeFilter === 'upcoming') {
      if (item.type === 'maintenance') {
        return item.maintenanceStatus === 'upcoming' || item.maintenanceStatus === 'due_soon';
      }
      return isFuture(new Date(item.date));
    }
    if (activeFilter === 'overdue') {
      return item.type === 'maintenance' && item.maintenanceStatus === 'overdue';
    }
    return true;
  });

  // Group items by date - memoized to prevent unnecessary recalculations
  const groupedItems = useMemo<GroupedItems>(() => {
    return filteredItems.reduce((groups, item) => {
      const dateKey = item.date.split('T')[0];
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(item);
      return groups;
    }, {} as GroupedItems);
  }, [filteredItems]);

  // Sort dates - memoized
  const sortedDates = useMemo(() => {
    return Object.keys(groupedItems).sort((a, b) => {
      if (activeFilter === 'upcoming') {
        return new Date(a).getTime() - new Date(b).getTime();
      }
      return new Date(b).getTime() - new Date(a).getTime();
    });
  }, [groupedItems, activeFilter]);

  // Calculate stats
  const thisMonthTotal = items
    .filter((item) => item.type === 'expense' && isThisMonth(new Date(item.date)))
    .reduce((sum, item) => sum + (item.amount || 0), 0);

  const overdueCount = items.filter(i => i.type === 'maintenance' && i.maintenanceStatus === 'overdue').length;
  const expenseCount = items.filter(i => i.type === 'expense').length;

  const handleItemPress = (item: TimelineItem) => {
    if (item.type === 'expense') {
      navigation.navigate('ExpenseDetail', { expenseId: item.id });
    } else if (item.type === 'maintenance' && item.propertyId) {
      navigation.navigate('Maintenance', { propertyId: item.propertyId });
    }
  };

  return (
    <View className={`flex-1 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
      {/* Header */}
      <LinearGradient
        colors={isDark
          ? ['#1e293b', '#0f172a']
          : ['#ffffff', '#f8fafc']
        }
        style={{ paddingTop: insets.top, paddingBottom: 16 }}
      >
        <Animated.View
          className="px-5 pt-4"
          style={{
            opacity: headerAnim,
            transform: [{
              translateY: headerAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-10, 0],
              })
            }]
          }}
        >
          <View className="flex-row items-center justify-between mb-1">
            <View>
              <Text className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {t('timeline.title')}
              </Text>
              <Text className={`text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {t('timeline.subtitle')}
              </Text>
            </View>
            {overdueCount > 0 && (
              <View className="bg-red-500 px-3 py-1.5 rounded-full flex-row items-center">
                <AlertCircle size={14} color="#fff" />
                <Text className="text-xs font-bold text-white ml-1">{overdueCount} {t('timeline.overdue')}</Text>
              </View>
            )}
          </View>
        </Animated.View>

        {/* Filter Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-4"
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
        >
          {filterTabs.map((tab) => (
            <FilterChip
              key={tab.key}
              tab={tab}
              isActive={activeFilter === tab.key}
              onPress={() => setActiveFilter(tab.key)}
              isDark={isDark}
            />
          ))}
        </ScrollView>
      </LinearGradient>

      {/* Stats Summary */}
      {items.length > 0 && activeFilter !== 'overdue' && activeFilter !== 'upcoming' && (
        <View className={`mx-5 mt-4 p-4 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-white'}`}
          style={{
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.3 : 0.06,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <LinearGradient
                colors={[COLORS.primary[500], COLORS.primary[600]]}
                style={{ width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}
              >
                <TrendingUp size={24} color="#fff" />
              </LinearGradient>
              <View>
                <Text className={`text-xs uppercase font-semibold tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {t('home.thisMonth')}
                </Text>
                <Text className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {formatCurrency(thisMonthTotal)}
                </Text>
              </View>
            </View>
            <View className="items-end">
              <Text className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                {format(new Date(), 'MMMM yyyy', { locale: dateLocale })}
              </Text>
              <Text className={`text-sm font-medium mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {expenseCount} {t('timeline.expenseCount')}
              </Text>
            </View>
          </View>
        </View>
      )}

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 120, paddingTop: 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary[600]}
          />
        }
      >
        {filteredItems.length === 0 && !loading ? (
          <View className="flex-1 pt-12 px-8">
            <EmptyState
              icon={activeFilter === 'overdue'
                ? <CheckCircle2 size={52} color={COLORS.primary[500]} />
                : <Clock size={52} color={COLORS.slate[400]} />
              }
              title={activeFilter === 'overdue' ? t('timeline.allCaughtUp') : t('timeline.noActivities')}
              description={activeFilter === 'overdue'
                ? t('timeline.noOverdueTasks')
                : t('timeline.noActivitiesDescription')
              }
            />
          </View>
        ) : (
          <View className="px-5">
            {sortedDates.map((dateKey, dateIndex) => (
              <View key={dateKey} className="mb-6">
                {/* Date Header */}
                <View className="flex-row items-center mb-3">
                  <View
                    className="w-3 h-3 rounded-full mr-3"
                    style={{
                      backgroundColor: dateIndex === 0 ? COLORS.primary[500] : (isDark ? COLORS.slate[600] : COLORS.slate[300]),
                    }}
                  />
                  <Text className={`text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    {formatDateHeader(dateKey, dateLocale, t)}
                  </Text>
                  <View className="flex-1 h-px ml-3" style={{
                    backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                  }} />
                </View>

                {/* Timeline Items */}
                <View className="ml-1.5 border-l-2 pl-5 gap-3" style={{
                  borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                }}>
                  {groupedItems[dateKey].map((item, itemIndex) => (
                    <TimelineItemCard
                      key={item.id}
                      item={item}
                      onPress={() => handleItemPress(item)}
                      isDark={isDark}
                      index={itemIndex}
                      t={t}
                    />
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
