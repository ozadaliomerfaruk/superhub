import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image,
  Linking,
  Alert,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Phone,
  Mail,
  Building2,
  Star,
  MapPin,
  Edit3,
  Trash2,
  Calendar,
  DollarSign,
  Wrench,
  MessageCircle,
  ChevronRight,
  Clock,
  FileText,
  Plus,
  CheckCircle,
  ClipboardList,
  AlertCircle,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { RootStackParamList } from '../../navigation/types';
import { Worker, Expense, MaintenanceTaskWithWorker, MaintenanceCompletionWithWorker } from '../../types';
import { workerRepository, expenseRepository, maintenanceRepository, maintenanceCompletionRepository } from '../../services/database';
import { ScreenHeader, Card, PressableCard, Button, IconButton, Badge, EmptyState } from '../../components/ui';
import { COLORS, EXPENSE_TYPES } from '../../constants/theme';
import { formatCurrency } from '../../utils/currency';
import { formatDate, formatRelativeDate } from '../../utils/date';
import { useTheme } from '../../contexts';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type WorkerDetailRouteProp = RouteProp<RootStackParamList, 'WorkerDetail'>;

export function WorkerDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<WorkerDetailRouteProp>();
  const { workerId } = route.params;
  const { isDark } = useTheme();

  const [worker, setWorker] = useState<Worker | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [assignedTasks, setAssignedTasks] = useState<MaintenanceTaskWithWorker[]>([]);
  const [completedTasks, setCompletedTasks] = useState<MaintenanceCompletionWithWorker[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [workerData, expensesData, assignedTasksData, completedTasksData] = await Promise.all([
        workerRepository.getById(workerId),
        expenseRepository.getByWorkerId(workerId),
        maintenanceRepository.getByAssignedWorkerId(workerId),
        maintenanceCompletionRepository.getByWorkerId(workerId),
      ]);
      setWorker(workerData);
      setExpenses(expensesData);
      setAssignedTasks(assignedTasksData);
      setCompletedTasks(completedTasksData);
    } catch (error) {
      console.error('Failed to load worker:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [workerId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleCall = async () => {
    if (worker?.phone) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Linking.openURL(`tel:${worker.phone}`);
    }
  };

  const handleEmail = async () => {
    if (worker?.email) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Linking.openURL(`mailto:${worker.email}`);
    }
  };

  const handleMessage = async () => {
    if (worker?.phone) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Linking.openURL(`sms:${worker.phone}`);
    }
  };

  const handleEdit = () => {
    navigation.navigate('EditWorker', { workerId });
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Worker',
      `Are you sure you want to delete "${worker?.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await workerRepository.delete(workerId);
              navigation.goBack();
            } catch (error) {
              console.error('Failed to delete worker:', error);
              Alert.alert('Error', 'Failed to delete worker');
            }
          },
        },
      ]
    );
  };

  const handleExpensePress = (expense: Expense) => {
    navigation.navigate('ExpenseDetail', { expenseId: expense.id });
  };

  const handleAddExpense = () => {
    // Navigate to add expense with worker pre-selected
    // For now, we can't select a property, so this is a placeholder
    Alert.alert('Add Expense', 'Please add an expense from a property and link it to this worker.');
  };

  if (!worker) {
    return (
      <View className={`flex-1 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
        <ScreenHeader
          title="Worker"
          showBack
          onBack={() => navigation.goBack()}
        />
        <View className="flex-1 items-center justify-center">
          <Text className={isDark ? 'text-slate-400' : 'text-slate-500'}>Loading...</Text>
        </View>
      </View>
    );
  }

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const recentExpenses = expenses.slice(0, 5);

  // Render star rating
  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          size={18}
          color={i <= rating ? '#f59e0b' : isDark ? COLORS.slate[600] : COLORS.slate[300]}
          fill={i <= rating ? '#f59e0b' : 'transparent'}
        />
      );
    }
    return stars;
  };

  return (
    <View className={`flex-1 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <ScreenHeader
        title="Worker Details"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <View className="flex-row gap-2">
            <IconButton
              icon={<Edit3 size={20} color={isDark ? COLORS.slate[400] : COLORS.slate[600]} />}
              variant="default"
              onPress={handleEdit}
            />
            <IconButton
              icon={<Trash2 size={20} color={COLORS.error} />}
              variant="default"
              onPress={handleDelete}
            />
          </View>
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
        {/* Profile Header */}
        <View className={`px-5 py-6 border-b ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <View className="flex-row items-start">
            {/* Avatar */}
            {worker.imageUri ? (
              <Image
                source={{ uri: worker.imageUri }}
                className="w-20 h-20 rounded-2xl"
                resizeMode="cover"
              />
            ) : (
              <View className="w-20 h-20 rounded-2xl bg-pink-500 items-center justify-center">
                <Text className="text-3xl font-bold text-white">
                  {worker.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}

            {/* Info */}
            <View className="flex-1 ml-4">
              <Text className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{worker.name}</Text>

              {worker.company && (
                <View className="flex-row items-center mt-1">
                  <Building2 size={14} color={isDark ? COLORS.slate[400] : COLORS.slate[500]} />
                  <Text className={`text-sm ml-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{worker.company}</Text>
                </View>
              )}

              {/* Rating */}
              {worker.rating && (
                <View className="flex-row items-center mt-2 gap-0.5">
                  {renderStars(worker.rating)}
                  <Text className="text-sm font-semibold text-amber-500 ml-2">
                    {worker.rating.toFixed(1)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Specialties */}
          {worker.specialty.length > 0 && (
            <View className="flex-row flex-wrap gap-2 mt-4">
              {worker.specialty.map((spec, index) => (
                <View
                  key={index}
                  className={`px-3 py-1.5 rounded-full ${isDark ? 'bg-primary-900/40' : 'bg-primary-50'}`}
                >
                  <Text className={`text-sm font-medium ${isDark ? 'text-primary-400' : 'text-primary-700'}`}>{spec}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Quick Actions */}
          <View className="flex-row gap-3 mt-5">
            {worker.phone && (
              <TouchableOpacity
                onPress={handleCall}
                className="flex-1 flex-row items-center justify-center bg-primary-500 py-3 rounded-xl"
                activeOpacity={0.8}
              >
                <Phone size={18} color="#ffffff" />
                <Text className="text-white font-semibold ml-2">Call</Text>
              </TouchableOpacity>
            )}
            {worker.phone && (
              <TouchableOpacity
                onPress={handleMessage}
                className={`flex-1 flex-row items-center justify-center py-3 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}
                activeOpacity={0.8}
              >
                <MessageCircle size={18} color={isDark ? COLORS.slate[300] : COLORS.slate[700]} />
                <Text className={`font-semibold ml-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Message</Text>
              </TouchableOpacity>
            )}
            {worker.email && (
              <TouchableOpacity
                onPress={handleEmail}
                className={`flex-1 flex-row items-center justify-center py-3 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}
                activeOpacity={0.8}
              >
                <Mail size={18} color={isDark ? COLORS.slate[300] : COLORS.slate[700]} />
                <Text className={`font-semibold ml-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Email</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Stats Cards */}
        <View className="flex-row gap-3 px-5 mt-5">
          <Card variant="default" padding="md" className="flex-1">
            <View className="flex-row items-center mb-2">
              <View className={`w-8 h-8 rounded-lg items-center justify-center ${isDark ? 'bg-green-900/40' : 'bg-green-100'}`}>
                <DollarSign size={16} color={COLORS.success} />
              </View>
            </View>
            <Text className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {formatCurrency(totalExpenses)}
            </Text>
            <Text className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Total Paid</Text>
          </Card>

          <Card variant="default" padding="md" className="flex-1">
            <View className="flex-row items-center mb-2">
              <View className={`w-8 h-8 rounded-lg items-center justify-center ${isDark ? 'bg-blue-900/40' : 'bg-blue-100'}`}>
                <Wrench size={16} color={COLORS.info} />
              </View>
            </View>
            <Text className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {expenses.length}
            </Text>
            <Text className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Jobs Completed</Text>
          </Card>

          <Card variant="default" padding="md" className="flex-1">
            <View className="flex-row items-center mb-2">
              <View className={`w-8 h-8 rounded-lg items-center justify-center ${isDark ? 'bg-amber-900/40' : 'bg-amber-100'}`}>
                <Clock size={16} color={COLORS.warning} />
              </View>
            </View>
            <Text className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {expenses.length > 0 ? formatRelativeDate(expenses[0].date) : '-'}
            </Text>
            <Text className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Last Job</Text>
          </Card>
        </View>

        {/* Contact Info */}
        <View className="px-5 mt-5">
          <Text className={`text-sm font-semibold uppercase tracking-wide mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Contact Information
          </Text>
          <Card variant="default" padding="none">
            {worker.phone && (
              <TouchableOpacity
                onPress={handleCall}
                className={`flex-row items-center px-4 py-3.5 border-b ${isDark ? 'border-slate-700' : 'border-slate-100'}`}
                activeOpacity={0.7}
              >
                <View className={`w-9 h-9 rounded-xl items-center justify-center ${isDark ? 'bg-primary-900/40' : 'bg-primary-50'}`}>
                  <Phone size={18} color={COLORS.primary[isDark ? 400 : 600]} />
                </View>
                <View className="flex-1 ml-3">
                  <Text className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Phone</Text>
                  <Text className={`text-base font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{worker.phone}</Text>
                </View>
                <ChevronRight size={20} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
              </TouchableOpacity>
            )}
            {worker.email && (
              <TouchableOpacity
                onPress={handleEmail}
                className="flex-row items-center px-4 py-3.5"
                activeOpacity={0.7}
              >
                <View className={`w-9 h-9 rounded-xl items-center justify-center ${isDark ? 'bg-blue-900/40' : 'bg-blue-50'}`}>
                  <Mail size={18} color={COLORS.info} />
                </View>
                <View className="flex-1 ml-3">
                  <Text className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Email</Text>
                  <Text className={`text-base font-medium ${isDark ? 'text-white' : 'text-slate-900'}`} numberOfLines={1}>
                    {worker.email}
                  </Text>
                </View>
                <ChevronRight size={20} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
              </TouchableOpacity>
            )}
            {!worker.phone && !worker.email && (
              <View className="px-4 py-4">
                <Text className={`text-center ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>No contact information added</Text>
              </View>
            )}
          </Card>
        </View>

        {/* Notes */}
        {worker.notes && (
          <View className="px-5 mt-5">
            <Text className={`text-sm font-semibold uppercase tracking-wide mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Notes
            </Text>
            <Card variant="default" padding="md">
              <Text className={`leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{worker.notes}</Text>
            </Card>
          </View>
        )}

        {/* Assigned Tasks */}
        <View className="px-5 mt-5">
          <View className="flex-row items-center justify-between mb-3">
            <Text className={`text-sm font-semibold uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Assigned Tasks
            </Text>
            <View className={`px-2 py-0.5 rounded-full ${isDark ? 'bg-primary-900/40' : 'bg-primary-100'}`}>
              <Text className={`text-xs font-semibold ${isDark ? 'text-primary-400' : 'text-primary-700'}`}>{assignedTasks.length}</Text>
            </View>
          </View>

          {assignedTasks.length > 0 ? (
            <View className="gap-2">
              {assignedTasks.slice(0, 5).map((task) => {
                const isOverdue = !task.isCompleted && new Date(task.nextDueDate) < new Date();
                return (
                  <Card key={task.id} variant="default" padding="md">
                    <View className="flex-row items-center">
                      <View
                        className={`w-10 h-10 rounded-xl items-center justify-center ${
                          task.isCompleted
                            ? isDark ? 'bg-green-900/40' : 'bg-green-100'
                            : isOverdue
                              ? isDark ? 'bg-red-900/40' : 'bg-red-100'
                              : isDark ? 'bg-amber-900/40' : 'bg-amber-100'
                        }`}
                      >
                        {task.isCompleted ? (
                          <CheckCircle size={18} color={COLORS.success} />
                        ) : isOverdue ? (
                          <AlertCircle size={18} color={COLORS.error} />
                        ) : (
                          <ClipboardList size={18} color={COLORS.warning} />
                        )}
                      </View>
                      <View className="flex-1 ml-3">
                        <Text className={`text-base font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`} numberOfLines={1}>
                          {task.title}
                        </Text>
                        <View className="flex-row items-center mt-0.5">
                          <Calendar size={12} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                          <Text className={`text-xs ml-1 ${isOverdue ? 'text-red-500' : isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            Due: {formatDate(task.nextDueDate)}
                          </Text>
                        </View>
                      </View>
                      <View className={`px-2 py-1 rounded-full ${
                        task.isCompleted
                          ? isDark ? 'bg-green-900/40' : 'bg-green-100'
                          : isOverdue
                            ? isDark ? 'bg-red-900/40' : 'bg-red-100'
                            : isDark ? 'bg-amber-900/40' : 'bg-amber-100'
                      }`}>
                        <Text className={`text-xs font-medium ${
                          task.isCompleted ? 'text-green-500' : isOverdue ? 'text-red-500' : 'text-amber-500'
                        }`}>
                          {task.isCompleted ? 'Done' : isOverdue ? 'Overdue' : 'Pending'}
                        </Text>
                      </View>
                    </View>
                  </Card>
                );
              })}
            </View>
          ) : (
            <Card variant="filled" padding="lg">
              <View className="items-center py-4">
                <View className={`w-12 h-12 rounded-2xl items-center justify-center mb-3 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                  <ClipboardList size={24} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                </View>
                <Text className={`font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>No tasks assigned</Text>
                <Text className={`text-sm text-center mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Tasks assigned to this worker will appear here
                </Text>
              </View>
            </Card>
          )}
        </View>

        {/* Completed Task History */}
        <View className="px-5 mt-5">
          <View className="flex-row items-center justify-between mb-3">
            <Text className={`text-sm font-semibold uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Completed Task History
            </Text>
            <View className={`px-2 py-0.5 rounded-full ${isDark ? 'bg-green-900/40' : 'bg-green-100'}`}>
              <Text className={`text-xs font-semibold ${isDark ? 'text-green-400' : 'text-green-700'}`}>{completedTasks.length}</Text>
            </View>
          </View>

          {completedTasks.length > 0 ? (
            <View className="gap-2">
              {completedTasks.slice(0, 5).map((completion) => (
                <Card key={completion.id} variant="default" padding="md">
                  <View className="flex-row items-center">
                    <View className={`w-10 h-10 rounded-xl items-center justify-center ${isDark ? 'bg-green-900/40' : 'bg-green-100'}`}>
                      <CheckCircle size={18} color={COLORS.success} />
                    </View>
                    <View className="flex-1 ml-3">
                      <Text className={`text-base font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`} numberOfLines={1}>
                        {completion.taskTitle || 'Unknown Task'}
                      </Text>
                      <View className="flex-row items-center mt-0.5">
                        <Calendar size={12} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                        <Text className={`text-xs ml-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {formatDate(completion.completedDate)}
                        </Text>
                        {completion.cost && (
                          <>
                            <View className={`mx-2 w-1 h-1 rounded-full ${isDark ? 'bg-slate-600' : 'bg-slate-300'}`} />
                            <Text className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{formatCurrency(completion.cost)}</Text>
                          </>
                        )}
                      </View>
                      {completion.notes && (
                        <Text className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} numberOfLines={1}>
                          {completion.notes}
                        </Text>
                      )}
                    </View>
                  </View>
                </Card>
              ))}
            </View>
          ) : (
            <Card variant="filled" padding="lg">
              <View className="items-center py-4">
                <View className={`w-12 h-12 rounded-2xl items-center justify-center mb-3 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                  <CheckCircle size={24} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                </View>
                <Text className={`font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>No tasks completed yet</Text>
                <Text className={`text-sm text-center mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Completed tasks by this worker will appear here
                </Text>
              </View>
            </Card>
          )}
        </View>

        {/* Recent Jobs */}
        <View className="px-5 mt-5 mb-8">
          <View className="flex-row items-center justify-between mb-3">
            <Text className={`text-sm font-semibold uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Recent Jobs (Expenses)
            </Text>
            {expenses.length > 5 && (
              <TouchableOpacity>
                <Text className="text-sm font-medium text-primary-500">See All</Text>
              </TouchableOpacity>
            )}
          </View>

          {recentExpenses.length > 0 ? (
            <View className="gap-2">
              {recentExpenses.map((expense) => {
                const typeConfig = EXPENSE_TYPES[expense.type] || EXPENSE_TYPES.other;
                return (
                  <PressableCard
                    key={expense.id}
                    variant="default"
                    padding="md"
                    onPress={() => handleExpensePress(expense)}
                  >
                    <View className="flex-row items-center">
                      <View
                        className="w-10 h-10 rounded-xl items-center justify-center"
                        style={{ backgroundColor: isDark ? `${typeConfig.color}25` : `${typeConfig.color}15` }}
                      >
                        <Wrench size={18} color={typeConfig.color} />
                      </View>
                      <View className="flex-1 ml-3">
                        <Text className={`text-base font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`} numberOfLines={1}>
                          {expense.description}
                        </Text>
                        <View className="flex-row items-center mt-0.5">
                          <Calendar size={12} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                          <Text className={`text-xs ml-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {formatDate(expense.date)}
                          </Text>
                          <View className={`mx-2 w-1 h-1 rounded-full ${isDark ? 'bg-slate-600' : 'bg-slate-300'}`} />
                          <Text className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{expense.category}</Text>
                        </View>
                      </View>
                      <Text className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {formatCurrency(expense.amount)}
                      </Text>
                    </View>
                  </PressableCard>
                );
              })}
            </View>
          ) : (
            <Card variant="filled" padding="lg">
              <View className="items-center py-4">
                <View className={`w-12 h-12 rounded-2xl items-center justify-center mb-3 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                  <FileText size={24} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                </View>
                <Text className={`font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>No jobs recorded yet</Text>
                <Text className={`text-sm text-center mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Expenses linked to this worker will appear here
                </Text>
              </View>
            </Card>
          )}
        </View>

        {/* Member Since */}
        <View className="px-5 pb-10">
          <View className="flex-row items-center justify-center py-3">
            <Calendar size={14} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
            <Text className={`text-sm ml-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              Added {formatDate(worker.createdAt)}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
