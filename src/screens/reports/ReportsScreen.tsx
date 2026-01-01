import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  TrendingUp,
  TrendingDown,
  PieChart,
  BarChart3,
  Calendar,
  Home,
  Wrench,
  Receipt,
  ShoppingBag,
  Settings,
  MoreHorizontal,
} from 'lucide-react-native';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { RootStackParamList } from '../../navigation/types';
import { Property, Expense } from '../../types';
import { expenseRepository, propertyRepository } from '../../services/database';
import { ScreenHeader, Card } from '../../components/ui';
import { COLORS, EXPENSE_TYPES, SHADOWS } from '../../constants/theme';
import { formatCurrency } from '../../utils/currency';
import { useTheme } from '../../contexts';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MonthlyData {
  month: string;
  total: number;
  byType: Record<string, number>;
}

interface CategoryData {
  category: string;
  total: number;
  count: number;
  color: string;
}

export function ReportsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();

  const [properties, setProperties] = useState<Property[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [totalThisMonth, setTotalThisMonth] = useState(0);
  const [totalLastMonth, setTotalLastMonth] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [propertiesData, expensesData] = await Promise.all([
        propertyRepository.getAll(),
        expenseRepository.getAll(),
      ]);

      setProperties(propertiesData);
      setExpenses(expensesData);

      // Calculate monthly data for last 6 months
      const monthly: MonthlyData[] = [];
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const start = startOfMonth(date);
        const end = endOfMonth(date);
        const monthExpenses = expensesData.filter(e => {
          const expDate = new Date(e.date);
          return expDate >= start && expDate <= end;
        });

        const byType: Record<string, number> = {};
        let total = 0;
        monthExpenses.forEach(e => {
          total += e.amount;
          byType[e.type] = (byType[e.type] || 0) + e.amount;
        });

        monthly.push({
          month: format(date, 'MMM'),
          total,
          byType,
        });
      }
      setMonthlyData(monthly);

      // Calculate this month and last month totals
      const thisMonthStart = startOfMonth(new Date());
      const thisMonthEnd = endOfMonth(new Date());
      const lastMonthStart = startOfMonth(subMonths(new Date(), 1));
      const lastMonthEnd = endOfMonth(subMonths(new Date(), 1));

      const thisMonth = expensesData
        .filter(e => {
          const d = new Date(e.date);
          return d >= thisMonthStart && d <= thisMonthEnd;
        })
        .reduce((sum, e) => sum + e.amount, 0);

      const lastMonth = expensesData
        .filter(e => {
          const d = new Date(e.date);
          return d >= lastMonthStart && d <= lastMonthEnd;
        })
        .reduce((sum, e) => sum + e.amount, 0);

      setTotalThisMonth(thisMonth);
      setTotalLastMonth(lastMonth);

      // Calculate category breakdown
      const categoryMap: Record<string, { total: number; count: number }> = {};
      expensesData
        .filter(e => {
          const d = new Date(e.date);
          return d >= thisMonthStart && d <= thisMonthEnd;
        })
        .forEach(e => {
          if (!categoryMap[e.type]) {
            categoryMap[e.type] = { total: 0, count: 0 };
          }
          categoryMap[e.type].total += e.amount;
          categoryMap[e.type].count += 1;
        });

      const categories: CategoryData[] = Object.entries(categoryMap)
        .map(([type, data]) => ({
          category: type,
          total: data.total,
          count: data.count,
          color: EXPENSE_TYPES[type as keyof typeof EXPENSE_TYPES]?.color || COLORS.slate[500],
        }))
        .sort((a, b) => b.total - a.total);

      setCategoryData(categories);
    } catch (error) {
      console.error('Failed to load reports data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const percentChange = totalLastMonth > 0
    ? ((totalThisMonth - totalLastMonth) / totalLastMonth) * 100
    : 0;

  const maxMonthlyTotal = Math.max(...monthlyData.map(m => m.total), 1);

  const getTypeIcon = (type: string) => {
    const iconProps = { size: 16, color: '#ffffff' };
    switch (type) {
      case 'repair':
        return <Wrench {...iconProps} />;
      case 'bill':
        return <Receipt {...iconProps} />;
      case 'maintenance':
        return <Settings {...iconProps} />;
      case 'purchase':
        return <ShoppingBag {...iconProps} />;
      default:
        return <MoreHorizontal {...iconProps} />;
    }
  };

  return (
    <View className={`flex-1 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <ScreenHeader
        title="Reports & Analytics"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary[600]}
          />
        }
      >
        {/* Summary Cards */}
        <View className="flex-row gap-3 mb-5">
          <View
            className={`flex-1 rounded-2xl p-4 ${isDark ? 'bg-slate-800' : 'bg-white'}`}
            style={SHADOWS.sm}
          >
            <View className="flex-row items-center justify-between mb-2">
              <Text className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                This Month
              </Text>
              <View className="w-8 h-8 rounded-full bg-primary-100 items-center justify-center">
                <Calendar size={16} color={COLORS.primary[600]} />
              </View>
            </View>
            <Text className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {formatCurrency(totalThisMonth)}
            </Text>
            {percentChange !== 0 && (
              <View className="flex-row items-center mt-1">
                {percentChange > 0 ? (
                  <TrendingUp size={14} color={COLORS.error} />
                ) : (
                  <TrendingDown size={14} color={COLORS.primary[600]} />
                )}
                <Text
                  className="text-xs ml-1 font-medium"
                  style={{ color: percentChange > 0 ? COLORS.error : COLORS.primary[600] }}
                >
                  {Math.abs(percentChange).toFixed(1)}% vs last month
                </Text>
              </View>
            )}
          </View>

          <View
            className={`flex-1 rounded-2xl p-4 ${isDark ? 'bg-slate-800' : 'bg-white'}`}
            style={SHADOWS.sm}
          >
            <View className="flex-row items-center justify-between mb-2">
              <Text className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Properties
              </Text>
              <View className="w-8 h-8 rounded-full bg-blue-100 items-center justify-center">
                <Home size={16} color={COLORS.info} />
              </View>
            </View>
            <Text className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {properties.length}
            </Text>
            <Text className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {expenses.length} total expenses
            </Text>
          </View>
        </View>

        {/* Monthly Trend Chart */}
        <View
          className={`rounded-2xl p-5 mb-5 ${isDark ? 'bg-slate-800' : 'bg-white'}`}
          style={SHADOWS.md}
        >
          <View className="flex-row items-center mb-4">
            <BarChart3 size={20} color={COLORS.primary[600]} />
            <Text className={`text-base font-semibold ml-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Monthly Spending Trend
            </Text>
          </View>

          {/* Bar Chart */}
          <View className="flex-row items-end justify-between h-32 mb-2">
            {monthlyData.map((month, index) => {
              const height = (month.total / maxMonthlyTotal) * 100;
              return (
                <View key={index} className="items-center flex-1">
                  <View
                    className="w-6 rounded-t-lg bg-primary-500"
                    style={{ height: `${Math.max(height, 5)}%` }}
                  />
                </View>
              );
            })}
          </View>

          {/* Month Labels */}
          <View className="flex-row justify-between">
            {monthlyData.map((month, index) => (
              <View key={index} className="items-center flex-1">
                <Text className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {month.month}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Category Breakdown */}
        <View
          className={`rounded-2xl p-5 mb-5 ${isDark ? 'bg-slate-800' : 'bg-white'}`}
          style={SHADOWS.md}
        >
          <View className="flex-row items-center mb-4">
            <PieChart size={20} color={COLORS.primary[600]} />
            <Text className={`text-base font-semibold ml-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Spending by Category
            </Text>
            <Text className={`text-sm ml-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              (This Month)
            </Text>
          </View>

          {categoryData.length === 0 ? (
            <Text className={`text-center py-8 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              No expenses this month
            </Text>
          ) : (
            <>
              {/* Visual bar breakdown */}
              <View className={`h-4 rounded-full overflow-hidden flex-row mb-4 ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                {categoryData.map((cat, index) => {
                  const width = totalThisMonth > 0 ? (cat.total / totalThisMonth) * 100 : 0;
                  return (
                    <View
                      key={index}
                      style={{ width: `${width}%`, backgroundColor: cat.color }}
                    />
                  );
                })}
              </View>

              {/* Category List */}
              {categoryData.map((cat, index) => {
                const percent = totalThisMonth > 0 ? (cat.total / totalThisMonth) * 100 : 0;
                return (
                  <View
                    key={index}
                    className={`flex-row items-center justify-between py-3 ${
                      index < categoryData.length - 1 ? `border-b ${isDark ? 'border-slate-700' : 'border-slate-100'}` : ''
                    }`}
                  >
                    <View className="flex-row items-center">
                      <View
                        className="w-8 h-8 rounded-lg items-center justify-center"
                        style={{ backgroundColor: cat.color }}
                      >
                        {getTypeIcon(cat.category)}
                      </View>
                      <View className="ml-3">
                        <Text className={`text-sm font-medium capitalize ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {cat.category}
                        </Text>
                        <Text className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {cat.count} expense{cat.count !== 1 ? 's' : ''}
                        </Text>
                      </View>
                    </View>
                    <View className="items-end">
                      <Text className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {formatCurrency(cat.total)}
                      </Text>
                      <Text className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {percent.toFixed(1)}%
                      </Text>
                    </View>
                  </View>
                );
              })}
            </>
          )}
        </View>

        {/* Quick Stats */}
        <View
          className={`rounded-2xl p-5 ${isDark ? 'bg-slate-800' : 'bg-white'}`}
          style={SHADOWS.md}
        >
          <Text className={`text-base font-semibold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Quick Stats
          </Text>

          <View className="flex-row flex-wrap">
            <View className="w-1/2 p-2">
              <View className={`rounded-xl p-3 ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
                <Text className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Avg. Expense</Text>
                <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {formatCurrency(expenses.length > 0 ? expenses.reduce((s, e) => s + e.amount, 0) / expenses.length : 0)}
                </Text>
              </View>
            </View>
            <View className="w-1/2 p-2">
              <View className={`rounded-xl p-3 ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
                <Text className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Total All Time</Text>
                <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {formatCurrency(expenses.reduce((s, e) => s + e.amount, 0))}
                </Text>
              </View>
            </View>
            <View className="w-1/2 p-2">
              <View className={`rounded-xl p-3 ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
                <Text className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Largest Expense</Text>
                <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {formatCurrency(expenses.length > 0 ? Math.max(...expenses.map(e => e.amount)) : 0)}
                </Text>
              </View>
            </View>
            <View className="w-1/2 p-2">
              <View className={`rounded-xl p-3 ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
                <Text className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>This Year</Text>
                <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {formatCurrency(
                    expenses
                      .filter(e => new Date(e.date).getFullYear() === new Date().getFullYear())
                      .reduce((s, e) => s + e.amount, 0)
                  )}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
