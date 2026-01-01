import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronRight,
  Home,
  ClipboardList,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { RootStackParamList } from '../../navigation/types';
import { MaintenanceTaskWithWorker, Property } from '../../types';
import { maintenanceRepository, propertyRepository } from '../../services/database';
import { ScreenHeader, Card, EmptyState } from '../../components/ui';
import { COLORS } from '../../constants/theme';
import { formatDate } from '../../utils/date';
import { useTheme } from '../../contexts';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type TaskStatus = 'overdue' | 'due_soon' | 'upcoming' | 'completed';

interface TaskWithProperty extends MaintenanceTaskWithWorker {
  propertyName: string;
}

function getTaskStatus(task: MaintenanceTaskWithWorker): TaskStatus {
  if (task.isCompleted) return 'completed';

  const now = new Date();
  const dueDate = new Date(task.nextDueDate);
  const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilDue < 0) return 'overdue';
  if (daysUntilDue <= task.reminderDaysBefore) return 'due_soon';
  return 'upcoming';
}

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  overdue: {
    label: 'Overdue',
    color: COLORS.error,
    bgColor: '#fef2f2',
    icon: <AlertTriangle size={18} color={COLORS.error} />,
  },
  due_soon: {
    label: 'Due Soon',
    color: COLORS.warning,
    bgColor: '#fffbeb',
    icon: <Clock size={18} color={COLORS.warning} />,
  },
  upcoming: {
    label: 'Upcoming',
    color: COLORS.info,
    bgColor: '#eff6ff',
    icon: <Calendar size={18} color={COLORS.info} />,
  },
  completed: {
    label: 'Completed',
    color: COLORS.success,
    bgColor: '#f0fdf4',
    icon: <CheckCircle2 size={18} color={COLORS.success} />,
  },
};

const FREQUENCY_LABELS: Record<string, string> = {
  once: 'One-time',
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  biannual: 'Every 6 months',
  yearly: 'Yearly',
};

export function AllTasksScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { isDark } = useTheme();

  const [tasks, setTasks] = useState<TaskWithProperty[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'pending' | 'completed' | 'all'>('pending');

  const loadData = useCallback(async () => {
    try {
      const propertiesData = await propertyRepository.getAll();
      setProperties(propertiesData);

      // Load tasks from all properties
      const allTasks: TaskWithProperty[] = [];
      for (const property of propertiesData) {
        const propertyTasks = await maintenanceRepository.getByPropertyId(property.id);
        allTasks.push(...propertyTasks.map(task => ({
          ...task,
          propertyName: property.name,
        })));
      }

      // Sort tasks: overdue first, then due_soon, then upcoming, then completed
      allTasks.sort((a, b) => {
        const statusOrder: Record<TaskStatus, number> = {
          overdue: 0,
          due_soon: 1,
          upcoming: 2,
          completed: 3,
        };
        const statusA = getTaskStatus(a);
        const statusB = getTaskStatus(b);

        if (statusOrder[statusA] !== statusOrder[statusB]) {
          return statusOrder[statusA] - statusOrder[statusB];
        }

        // Within same status, sort by due date
        return new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime();
      });

      setTasks(allTasks);
    } catch (error) {
      console.error('Failed to load tasks:', error);
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

  const handleTaskPress = (task: TaskWithProperty) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    navigation.navigate('Maintenance', { propertyId: task.propertyId });
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === 'pending') return !task.isCompleted;
    if (filter === 'completed') return task.isCompleted;
    return true;
  });

  const pendingCount = tasks.filter(t => !t.isCompleted).length;
  const completedCount = tasks.filter(t => t.isCompleted).length;
  const overdueCount = tasks.filter(t => getTaskStatus(t) === 'overdue').length;

  return (
    <View className={`flex-1 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <ScreenHeader
        title="All Tasks"
        showBack
        onBack={() => navigation.goBack()}
      />

      {/* Stats Summary */}
      <View className="flex-row gap-2 px-5 py-3">
        <View className={`flex-1 rounded-xl p-3 items-center ${isDark ? 'bg-slate-800' : 'bg-white'}`} style={{ borderWidth: 1, borderColor: isDark ? COLORS.slate[700] : '#f1f5f9' }}>
          <Text className="text-2xl font-bold text-blue-600">{pendingCount}</Text>
          <Text className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Pending</Text>
        </View>
        <View className={`flex-1 rounded-xl p-3 items-center ${isDark ? 'bg-slate-800' : 'bg-white'}`} style={{ borderWidth: 1, borderColor: isDark ? COLORS.slate[700] : '#f1f5f9' }}>
          <Text className="text-2xl font-bold text-red-500">{overdueCount}</Text>
          <Text className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Overdue</Text>
        </View>
        <View className={`flex-1 rounded-xl p-3 items-center ${isDark ? 'bg-slate-800' : 'bg-white'}`} style={{ borderWidth: 1, borderColor: isDark ? COLORS.slate[700] : '#f1f5f9' }}>
          <Text className="text-2xl font-bold text-green-600">{completedCount}</Text>
          <Text className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Completed</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View className="flex-row gap-2 px-5 mb-3">
        <TouchableOpacity
          onPress={() => setFilter('pending')}
          className={`flex-1 py-2.5 rounded-xl items-center ${filter === 'pending' ? 'bg-primary-500' : isDark ? 'bg-slate-800' : 'bg-white'}`}
          style={filter !== 'pending' ? { borderWidth: 1, borderColor: isDark ? COLORS.slate[700] : '#e2e8f0' } : undefined}
        >
          <Text className={`font-semibold text-sm ${filter === 'pending' ? 'text-white' : isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            Pending
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setFilter('completed')}
          className={`flex-1 py-2.5 rounded-xl items-center ${filter === 'completed' ? 'bg-primary-500' : isDark ? 'bg-slate-800' : 'bg-white'}`}
          style={filter !== 'completed' ? { borderWidth: 1, borderColor: isDark ? COLORS.slate[700] : '#e2e8f0' } : undefined}
        >
          <Text className={`font-semibold text-sm ${filter === 'completed' ? 'text-white' : isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            Completed
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setFilter('all')}
          className={`flex-1 py-2.5 rounded-xl items-center ${filter === 'all' ? 'bg-primary-500' : isDark ? 'bg-slate-800' : 'bg-white'}`}
          style={filter !== 'all' ? { borderWidth: 1, borderColor: isDark ? COLORS.slate[700] : '#e2e8f0' } : undefined}
        >
          <Text className={`font-semibold text-sm ${filter === 'all' ? 'text-white' : isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            All
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary[600]}
          />
        }
      >
        {filteredTasks.length === 0 ? (
          <View className="mt-10">
            <EmptyState
              icon={<ClipboardList size={48} color={COLORS.slate[400]} />}
              title={filter === 'pending' ? 'No Pending Tasks' : filter === 'completed' ? 'No Completed Tasks' : 'No Tasks'}
              description={filter === 'pending'
                ? 'All caught up! No pending maintenance tasks.'
                : filter === 'completed'
                ? 'No tasks have been completed yet.'
                : 'Add maintenance tasks from property pages.'
              }
            />
          </View>
        ) : (
          <View className="gap-3 pb-8">
            {filteredTasks.map((task) => {
              const status = getTaskStatus(task);
              const config = STATUS_CONFIG[status];

              return (
                <TouchableOpacity
                  key={task.id}
                  onPress={() => handleTaskPress(task)}
                  activeOpacity={0.7}
                >
                  <Card variant="default" padding="none">
                    <View className="p-4">
                      {/* Header Row */}
                      <View className="flex-row items-start justify-between mb-2">
                        <View className="flex-1 mr-3">
                          <Text className={`text-base font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`} numberOfLines={2}>
                            {task.title}
                          </Text>
                        </View>
                        <View
                          className="px-2.5 py-1 rounded-full flex-row items-center"
                          style={{ backgroundColor: config.bgColor }}
                        >
                          {config.icon}
                          <Text
                            className="text-xs font-semibold ml-1"
                            style={{ color: config.color }}
                          >
                            {config.label}
                          </Text>
                        </View>
                      </View>

                      {/* Property Name */}
                      <View className="flex-row items-center mb-2">
                        <Home size={14} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                        <Text className={`text-sm ml-1.5 font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                          {task.propertyName}
                        </Text>
                      </View>

                      {/* Details Row */}
                      <View className="flex-row items-center flex-wrap gap-3">
                        <View className="flex-row items-center">
                          <Calendar size={14} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                          <Text className={`text-xs ml-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {status === 'completed' && task.lastCompletedDate
                              ? `Done: ${formatDate(task.lastCompletedDate)}`
                              : `Due: ${formatDate(task.nextDueDate)}`
                            }
                          </Text>
                        </View>
                        <View className={`px-2 py-0.5 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                          <Text className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                            {FREQUENCY_LABELS[task.frequency] || task.frequency}
                          </Text>
                        </View>
                        {task.assignedWorkerName && (
                          <Text className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            Assigned: {task.assignedWorkerName}
                          </Text>
                        )}
                      </View>

                      {/* Arrow to indicate tap action */}
                      <View className="absolute right-4 top-1/2 -mt-3">
                        <ChevronRight size={20} color={isDark ? COLORS.slate[600] : COLORS.slate[300]} />
                      </View>
                    </View>
                  </Card>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
