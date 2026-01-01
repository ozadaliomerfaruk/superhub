import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import {
  DollarSign,
  Wrench,
  Receipt,
  Package,
  FileText,
  Plus,
  Calendar,
  TrendingUp,
} from 'lucide-react-native';
import { RootStackParamList } from '../../navigation/types';
import { Expense, Property } from '../../types';
import { expenseRepository, propertyRepository } from '../../services/database';
import { ScreenHeader, Card, Button, EmptyState, Badge, IconButton } from '../../components/ui';
import { COLORS, EXPENSE_TYPES, SHADOWS } from '../../constants/theme';
import { formatCurrency } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import { format, isThisMonth, isThisYear, startOfMonth, endOfMonth } from 'date-fns';
import { useTheme, useTranslation } from '../../contexts';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'PropertyExpenses'>;

const getExpenseIcon = (type: string) => {
  switch (type) {
    case 'repair': return <Wrench size={18} color={COLORS.categories.repair} />;
    case 'bill': return <Receipt size={18} color={COLORS.categories.bill} />;
    case 'maintenance': return <Wrench size={18} color={COLORS.categories.maintenance} />;
    case 'purchase': return <Package size={18} color={COLORS.info} />;
    default: return <FileText size={18} color={COLORS.slate[500]} />;
  }
};

export function PropertyExpensesScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const { propertyId } = route.params;

  const [property, setProperty] = useState<Property | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [propertyData, expensesData] = await Promise.all([
        propertyRepository.getById(propertyId),
        expenseRepository.getByPropertyId(propertyId),
      ]);
      setProperty(propertyData);
      setExpenses(expensesData);
    } catch (error) {
      console.error('Failed to load expenses:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [propertyId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Calculate stats
  const thisMonthTotal = expenses
    .filter(e => isThisMonth(new Date(e.date)))
    .reduce((sum, e) => sum + e.amount, 0);

  const thisYearTotal = expenses
    .filter(e => isThisYear(new Date(e.date)))
    .reduce((sum, e) => sum + e.amount, 0);

  const totalAll = expenses.reduce((sum, e) => sum + e.amount, 0);

  // Group expenses by month
  const groupedByMonth = expenses.reduce((groups, expense) => {
    const monthKey = format(new Date(expense.date), 'yyyy-MM');
    if (!groups[monthKey]) {
      groups[monthKey] = [];
    }
    groups[monthKey].push(expense);
    return groups;
  }, {} as Record<string, Expense[]>);

  const sortedMonths = Object.keys(groupedByMonth).sort((a, b) => b.localeCompare(a));

  return (
    <View className={`flex-1 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <ScreenHeader
        title={t('expense.title')}
        subtitle={property?.name}
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <IconButton
            icon={<Plus size={22} color={COLORS.primary[600]} />}
            variant="ghost"
            onPress={() => navigation.navigate('AddExpense', { propertyId })}
          />
        }
      />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary[600]}
          />
        }
      >
        {/* Stats Cards */}
        <View className="px-4 pt-4">
          <View className="flex-row gap-3 mb-4">
            <Card variant="filled" padding="md" className="flex-1 bg-primary-50">
              <View className="flex-row items-center mb-1">
                <TrendingUp size={14} color={COLORS.primary[600]} />
                <Text className="text-xs text-primary-600 font-medium ml-1">{t('common.thisMonth')}</Text>
              </View>
              <Text className="text-lg font-bold text-primary-700">
                {formatCurrency(thisMonthTotal)}
              </Text>
            </Card>
            <Card variant="filled" padding="md" className="flex-1 bg-amber-50">
              <View className="flex-row items-center mb-1">
                <Calendar size={14} color={COLORS.secondary[600]} />
                <Text className="text-xs text-amber-600 font-medium ml-1">{t('common.thisYear')}</Text>
              </View>
              <Text className="text-lg font-bold text-amber-700">
                {formatCurrency(thisYearTotal)}
              </Text>
            </Card>
          </View>

          <Card variant="default" padding="md" className="mb-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-xl bg-slate-100 items-center justify-center mr-3">
                  <DollarSign size={20} color={COLORS.slate[600]} />
                </View>
                <View>
                  <Text className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {t('expense.totalAllTime')}
                  </Text>
                  <Text className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {formatCurrency(totalAll)}
                  </Text>
                </View>
              </View>
              <Badge label={t('expense.expensesCount', { count: expenses.length })} variant="default" />
            </View>
          </Card>
        </View>

        {/* Expenses List */}
        {expenses.length === 0 ? (
          <View className="flex-1 pt-8 px-8">
            <EmptyState
              icon={<DollarSign size={44} color={COLORS.slate[400]} />}
              title={t('expense.noExpenses')}
              description={t('expense.noExpensesDescription')}
              actionLabel={t('expense.add')}
              onAction={() => navigation.navigate('AddExpense', { propertyId })}
            />
          </View>
        ) : (
          <View className="px-4 pb-8">
            {sortedMonths.map(monthKey => {
              const monthExpenses = groupedByMonth[monthKey];
              const monthTotal = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
              const monthDate = new Date(monthKey + '-01');

              return (
                <View key={monthKey} className="mb-6">
                  <View className="flex-row items-center justify-between mb-3">
                    <Text className={`text-sm font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {format(monthDate, 'MMMM yyyy')}
                    </Text>
                    <Text className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-700'}`}>
                      {formatCurrency(monthTotal)}
                    </Text>
                  </View>

                  <View className={`rounded-2xl overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-white'}`} style={SHADOWS.sm}>
                    {monthExpenses.map((expense, index) => (
                      <TouchableOpacity
                        key={expense.id}
                        onPress={() => navigation.navigate('ExpenseDetail', { expenseId: expense.id })}
                        activeOpacity={0.7}
                        className={`flex-row items-center px-4 py-3 ${
                          index < monthExpenses.length - 1
                            ? `border-b ${isDark ? 'border-slate-700' : 'border-slate-100'}`
                            : ''
                        }`}
                      >
                        <View
                          className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                          style={{
                            backgroundColor: `${EXPENSE_TYPES[expense.type]?.color || COLORS.slate[400]}15`,
                          }}
                        >
                          {getExpenseIcon(expense.type)}
                        </View>
                        <View className="flex-1">
                          <Text
                            className={`text-base font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}
                            numberOfLines={1}
                          >
                            {expense.description}
                          </Text>
                          <View className="flex-row items-center mt-0.5">
                            <Text
                              className="text-xs font-medium px-1.5 py-0.5 rounded"
                              style={{
                                backgroundColor: `${EXPENSE_TYPES[expense.type]?.color || COLORS.slate[400]}15`,
                                color: EXPENSE_TYPES[expense.type]?.color || COLORS.slate[600],
                              }}
                            >
                              {EXPENSE_TYPES[expense.type]?.label || 'Other'}
                            </Text>
                            <Text className={`text-xs ml-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                              {formatDate(expense.date, 'MMM d')}
                            </Text>
                          </View>
                        </View>
                        <Text className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {formatCurrency(expense.amount)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
