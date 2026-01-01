import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import {
  Settings,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Trash2,
  Edit3,
  X,
  Bell,
  User,
  History,
  ChevronDown,
  ChevronUp,
  DollarSign,
  FileText,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { RootStackParamList } from '../../navigation/types';
import { MaintenanceTaskWithWorker, MaintenanceCompletionWithWorker, Worker, Property } from '../../types';
import { maintenanceRepository, maintenanceCompletionRepository, propertyRepository, workerRepository } from '../../services/database';
import { notificationService } from '../../services/notifications';
import { ScreenHeader, Card, Button, Badge, Input } from '../../components/ui';
import { COLORS, MAINTENANCE_TEMPLATES } from '../../constants/theme';
import { formatDate, formatRelative, getCurrentISODate } from '../../utils/date';
import { useTheme } from '../../contexts';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type MaintenanceRouteProp = RouteProp<RootStackParamList, 'Maintenance'>;

type TaskStatus = 'overdue' | 'due_soon' | 'upcoming' | 'completed';

function getTaskStatus(task: MaintenanceTaskWithWorker): TaskStatus {
  if (task.isCompleted) return 'completed';

  const now = new Date();
  const dueDate = new Date(task.nextDueDate);
  const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilDue < 0) return 'overdue';
  if (daysUntilDue <= task.reminderDaysBefore) return 'due_soon';
  return 'upcoming';
}

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bgColor: string }> = {
  overdue: { label: 'Overdue', color: COLORS.error, bgColor: '#fef2f2' },
  due_soon: { label: 'Due Soon', color: COLORS.warning, bgColor: '#fffbeb' },
  upcoming: { label: 'Upcoming', color: COLORS.info, bgColor: '#eff6ff' },
  completed: { label: 'Completed', color: COLORS.success, bgColor: '#f0fdf4' },
};

const FREQUENCY_LABELS: Record<string, string> = {
  once: 'One-time',
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  biannual: 'Every 6 months',
  yearly: 'Yearly',
};

export function MaintenanceScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<MaintenanceRouteProp>();
  const { propertyId } = route.params;
  const { isDark } = useTheme();

  const [property, setProperty] = useState<Property | null>(null);
  const [tasks, setTasks] = useState<MaintenanceTaskWithWorker[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showWorkerPicker, setShowWorkerPicker] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  // Task form state
  const [editingTask, setEditingTask] = useState<MaintenanceTaskWithWorker | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskFrequency, setTaskFrequency] = useState<MaintenanceTaskWithWorker['frequency']>('once');
  const [taskDueDate, setTaskDueDate] = useState(new Date());
  const [tempTaskDueDate, setTempTaskDueDate] = useState(new Date());
  const [taskReminderDays, setTaskReminderDays] = useState(3);
  const [taskAssignedWorkerId, setTaskAssignedWorkerId] = useState<string | undefined>(undefined);

  // Completion form state
  const [completingTask, setCompletingTask] = useState<MaintenanceTaskWithWorker | null>(null);
  const [completionWorkerId, setCompletionWorkerId] = useState<string | undefined>(undefined);
  const [completionNotes, setCompletionNotes] = useState('');
  const [completionCost, setCompletionCost] = useState('');

  // History state
  const [historyTask, setHistoryTask] = useState<MaintenanceTaskWithWorker | null>(null);
  const [taskCompletions, setTaskCompletions] = useState<MaintenanceCompletionWithWorker[]>([]);

  const isEditing = editingTask !== null;

  const loadData = useCallback(async () => {
    try {
      const [propertyData, taskData, workerData] = await Promise.all([
        propertyRepository.getById(propertyId),
        maintenanceRepository.getByPropertyId(propertyId),
        workerRepository.getAll(),
      ]);
      setProperty(propertyData);
      setTasks(taskData);
      setWorkers(workerData);

      // Sync notifications for active tasks
      const activeTasks = taskData.filter((t) => !t.isCompleted);
      await notificationService.syncMaintenanceNotifications(activeTasks);
    } catch (error) {
      console.error('Failed to load maintenance data:', error);
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

  // Open completion modal instead of directly marking complete
  const handleOpenCompleteModal = (task: MaintenanceTaskWithWorker) => {
    setCompletingTask(task);
    setCompletionWorkerId(task.assignedWorkerId);
    setCompletionNotes('');
    setCompletionCost('');
    setShowCompleteModal(true);
  };

  const handleCompleteTask = async () => {
    if (!completingTask) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      // Create completion record
      await maintenanceCompletionRepository.create({
        taskId: completingTask.id,
        workerId: completionWorkerId,
        completedDate: getCurrentISODate(),
        notes: completionNotes || undefined,
        cost: completionCost ? parseFloat(completionCost) : undefined,
      });

      // Mark task complete (this will reschedule if recurring)
      await maintenanceRepository.markComplete(completingTask.id);

      setShowCompleteModal(false);
      setCompletingTask(null);
      loadData();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Failed to complete task:', error);
      Alert.alert('Error', 'Failed to complete task');
    }
  };

  const handleViewHistory = async (task: MaintenanceTaskWithWorker) => {
    setHistoryTask(task);
    try {
      const completions = await maintenanceCompletionRepository.getByTaskId(task.id);
      setTaskCompletions(completions);
      setShowHistoryModal(true);
    } catch (error) {
      console.error('Failed to load task history:', error);
      Alert.alert('Error', 'Failed to load task history');
    }
  };

  const handleDeleteTask = (task: MaintenanceTaskWithWorker) => {
    Alert.alert(
      'Delete Task',
      `Are you sure you want to delete "${task.title}"? This will also delete all completion history.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await maintenanceRepository.delete(task.id);
              loadData();
            } catch (error) {
              console.error('Failed to delete task:', error);
              Alert.alert('Error', 'Failed to delete task');
            }
          },
        },
      ]
    );
  };

  const handleAddTemplate = (template: typeof MAINTENANCE_TEMPLATES[number]) => {
    setEditingTask(null);
    setTaskTitle(template.title);
    const freq = template.frequency as MaintenanceTaskWithWorker['frequency'];
    setTaskFrequency(freq);
    setTaskReminderDays(template.reminderDaysBefore);
    setTaskAssignedWorkerId(undefined);

    const dueDate = new Date();
    switch (freq) {
      case 'weekly':
        dueDate.setDate(dueDate.getDate() + 7);
        break;
      case 'monthly':
        dueDate.setMonth(dueDate.getMonth() + 1);
        break;
      case 'quarterly':
        dueDate.setMonth(dueDate.getMonth() + 3);
        break;
      case 'biannual':
        dueDate.setMonth(dueDate.getMonth() + 6);
        break;
      case 'yearly':
        dueDate.setFullYear(dueDate.getFullYear() + 1);
        break;
      default:
        break;
    }
    setTaskDueDate(dueDate);
    setShowTemplates(false);
    setShowTaskModal(true);
  };

  const handleAddCustomTask = () => {
    setEditingTask(null);
    setTaskTitle('');
    setTaskFrequency('once');
    setTaskDueDate(new Date());
    setTaskReminderDays(3);
    setTaskAssignedWorkerId(undefined);
    setShowTemplates(false);
    setShowTaskModal(true);
  };

  const handleEditTask = (task: MaintenanceTaskWithWorker) => {
    setEditingTask(task);
    setTaskTitle(task.title);
    setTaskFrequency(task.frequency);
    setTaskDueDate(new Date(task.nextDueDate));
    setTaskReminderDays(task.reminderDaysBefore);
    setTaskAssignedWorkerId(task.assignedWorkerId);
    setShowTaskModal(true);
  };

  const resetTaskForm = () => {
    setEditingTask(null);
    setTaskTitle('');
    setTaskFrequency('once');
    setTaskDueDate(new Date());
    setTaskReminderDays(3);
    setTaskAssignedWorkerId(undefined);
  };

  const handleSaveTask = async () => {
    if (!taskTitle.trim()) {
      Alert.alert('Error', 'Please enter a task name');
      return;
    }

    try {
      if (isEditing && editingTask) {
        await maintenanceRepository.update(editingTask.id, {
          title: taskTitle.trim(),
          frequency: taskFrequency,
          nextDueDate: taskDueDate.toISOString(),
          reminderDaysBefore: taskReminderDays,
          assignedWorkerId: taskAssignedWorkerId,
        });
      } else {
        await maintenanceRepository.create({
          propertyId,
          title: taskTitle.trim(),
          frequency: taskFrequency,
          nextDueDate: taskDueDate.toISOString(),
          reminderDaysBefore: taskReminderDays,
          assignedWorkerId: taskAssignedWorkerId,
        });
      }

      setShowTaskModal(false);
      resetTaskForm();
      loadData();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Failed to save task:', error);
      Alert.alert('Error', `Failed to ${isEditing ? 'update' : 'create'} task`);
    }
  };

  const getDueDateText = (task: MaintenanceTaskWithWorker): string => {
    const now = new Date();
    const dueDate = new Date(task.nextDueDate);
    const days = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (days < 0) return `${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} overdue`;
    if (days === 0) return 'Due today';
    if (days === 1) return 'Due tomorrow';
    return `Due in ${days} days`;
  };

  const frequencyOptions: { label: string; value: MaintenanceTaskWithWorker['frequency']; description: string }[] = [
    { label: 'One-time', value: 'once', description: 'Task happens once on the selected date' },
    { label: 'Weekly', value: 'weekly', description: 'Repeats every 7 days' },
    { label: 'Monthly', value: 'monthly', description: 'Repeats every month' },
    { label: 'Quarterly', value: 'quarterly', description: 'Repeats every 3 months' },
    { label: 'Every 6 Months', value: 'biannual', description: 'Repeats twice a year' },
    { label: 'Yearly', value: 'yearly', description: 'Repeats once a year' },
  ];

  const reminderOptions = [
    { label: 'Same day', value: 0 },
    { label: '1 day before', value: 1 },
    { label: '3 days before', value: 3 },
    { label: '1 week before', value: 7 },
    { label: '2 weeks before', value: 14 },
    { label: '1 month before', value: 30 },
  ];

  const groupedTasks = tasks.reduce((acc, task) => {
    const status = getTaskStatus(task);
    if (!acc[status]) acc[status] = [];
    acc[status].push(task);
    return acc;
  }, {} as Record<TaskStatus, MaintenanceTaskWithWorker[]>);

  const statusOrder: TaskStatus[] = ['overdue', 'due_soon', 'upcoming', 'completed'];
  const overdueCount = groupedTasks.overdue?.length || 0;
  const dueSoonCount = groupedTasks.due_soon?.length || 0;
  const completedCount = groupedTasks.completed?.length || 0;

  const getWorkerName = (workerId?: string) => {
    if (!workerId) return null;
    return workers.find(w => w.id === workerId)?.name;
  };

  return (
    <View className={`flex-1 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <ScreenHeader
        title="Tasks"
        subtitle={property?.name}
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            onPress={() => setShowTemplates(!showTemplates)}
            className="w-10 h-10 rounded-xl bg-primary-500 items-center justify-center"
            activeOpacity={0.7}
          >
            <Plus size={22} color="#ffffff" />
          </TouchableOpacity>
        }
      />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary[600]} />
        }
      >
        {/* Stats Row */}
        <View className="flex-row px-5 pt-5 gap-3">
          <Card variant="default" padding="md" className="flex-1">
            <View className="items-center">
              <View className={`w-10 h-10 rounded-xl items-center justify-center mb-2 ${isDark ? 'bg-red-900/40' : 'bg-red-100'}`}>
                <AlertTriangle size={20} color={COLORS.error} />
              </View>
              <Text className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{overdueCount}</Text>
              <Text className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Overdue</Text>
            </View>
          </Card>
          <Card variant="default" padding="md" className="flex-1">
            <View className="items-center">
              <View className={`w-10 h-10 rounded-xl items-center justify-center mb-2 ${isDark ? 'bg-amber-900/40' : 'bg-amber-100'}`}>
                <Clock size={20} color={COLORS.warning} />
              </View>
              <Text className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{dueSoonCount}</Text>
              <Text className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Due Soon</Text>
            </View>
          </Card>
          <Card variant="default" padding="md" className="flex-1">
            <View className="items-center">
              <View className={`w-10 h-10 rounded-xl items-center justify-center mb-2 ${isDark ? 'bg-green-900/40' : 'bg-green-100'}`}>
                <CheckCircle2 size={20} color={COLORS.success} />
              </View>
              <Text className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{completedCount}</Text>
              <Text className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Completed</Text>
            </View>
          </Card>
        </View>

        {/* Templates Panel */}
        {showTemplates && (
          <View className="px-5 mt-4">
            <Card variant="filled" padding="md" className={`border ${isDark ? 'bg-primary-900/30 border-primary-800' : 'bg-primary-50 border-primary-100'}`}>
              <Text className={`text-sm font-semibold mb-3 ${isDark ? 'text-primary-400' : 'text-primary-700'}`}>Add from Templates</Text>
              <View className="gap-2">
                {MAINTENANCE_TEMPLATES.map((template, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => handleAddTemplate(template)}
                    className={`flex-row items-center justify-between rounded-lg px-3 py-2.5 border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-primary-100'}`}
                    activeOpacity={0.7}
                  >
                    <View className="flex-1">
                      <Text className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{template.title}</Text>
                      <Text className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{FREQUENCY_LABELS[template.frequency]}</Text>
                    </View>
                    <Plus size={18} color={COLORS.primary[isDark ? 400 : 600]} />
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                onPress={handleAddCustomTask}
                className={`flex-row items-center justify-center mt-3 py-2.5 border border-dashed rounded-lg ${isDark ? 'border-primary-700' : 'border-primary-300'}`}
                activeOpacity={0.7}
              >
                <Plus size={16} color={COLORS.primary[isDark ? 400 : 600]} />
                <Text className={`text-sm font-medium ml-1.5 ${isDark ? 'text-primary-400' : 'text-primary-600'}`}>Custom Task</Text>
              </TouchableOpacity>
            </Card>
          </View>
        )}

        {/* Tasks List */}
        {tasks.length === 0 ? (
          <View className="px-5 mt-6">
            <Card variant="filled" padding="lg">
              <View className="items-center py-6">
                <View className="w-16 h-16 rounded-2xl bg-slate-200 items-center justify-center mb-4">
                  <Settings size={32} color={COLORS.slate[400]} />
                </View>
                <Text className="text-lg font-semibold text-slate-700 text-center">No tasks yet</Text>
                <Text className="text-sm text-slate-500 text-center mt-2 px-4">
                  Add tasks to stay on top of home maintenance
                </Text>
                <Button
                  title="Add Task"
                  onPress={() => setShowTemplates(true)}
                  variant="primary"
                  className="mt-4"
                  icon={<Plus size={18} color="#ffffff" />}
                />
              </View>
            </Card>
          </View>
        ) : (
          <View className="px-5 mt-4 gap-4 pb-8">
            {statusOrder.map((status) => {
              const statusTasks = groupedTasks[status];
              if (!statusTasks || statusTasks.length === 0) return null;
              const config = STATUS_CONFIG[status];

              return (
                <View key={status}>
                  <View className="flex-row items-center mb-2">
                    <View className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: config.color }} />
                    <Text className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                      {config.label} ({statusTasks.length})
                    </Text>
                  </View>

                  <View className="gap-2">
                    {statusTasks.map((task) => {
                      const taskStatus = getTaskStatus(task);
                      const statusConfig = STATUS_CONFIG[taskStatus];
                      const isExpanded = expandedTaskId === task.id;

                      return (
                        <Card key={task.id} variant="default" padding="none">
                          <View className="h-1 rounded-t-xl" style={{ backgroundColor: statusConfig.color }} />
                          <TouchableOpacity
                            onPress={() => setExpandedTaskId(isExpanded ? null : task.id)}
                            activeOpacity={0.7}
                            className="p-4"
                          >
                            <View className="flex-row items-start">
                              {/* Status indicator */}
                              <View className="mt-0.5">
                                {task.isCompleted ? (
                                  <CheckCircle2 size={26} color={COLORS.success} fill={COLORS.success} />
                                ) : (
                                  <View
                                    className="w-[26px] h-[26px] rounded-full border-2"
                                    style={{ borderColor: statusConfig.color }}
                                  />
                                )}
                              </View>

                              <View className="flex-1 ml-3">
                                <Text
                                  className={`text-base font-semibold ${
                                    task.isCompleted ? 'text-slate-400' : 'text-slate-900'
                                  }`}
                                >
                                  {task.title}
                                </Text>

                                {/* Worker & Status Info */}
                                <View className="flex-row flex-wrap items-center gap-2 mt-2">
                                  <Badge label={FREQUENCY_LABELS[task.frequency]} variant="default" size="sm" />

                                  {task.isCompleted ? (
                                    <View className="flex-row items-center bg-green-50 px-2 py-1 rounded-lg">
                                      <CheckCircle2 size={12} color={COLORS.success} />
                                      <Text className="text-xs text-green-700 ml-1 font-medium">
                                        Done {formatRelative(task.lastCompletedDate!)}
                                      </Text>
                                    </View>
                                  ) : (
                                    <View
                                      className="flex-row items-center px-2 py-1 rounded-lg"
                                      style={{ backgroundColor: statusConfig.bgColor }}
                                    >
                                      <Calendar size={12} color={statusConfig.color} />
                                      <Text className="text-xs ml-1 font-medium" style={{ color: statusConfig.color }}>
                                        {getDueDateText(task)}
                                      </Text>
                                    </View>
                                  )}
                                </View>

                                {/* Last completed by worker */}
                                {task.lastCompletionWorkerName && (
                                  <View className="flex-row items-center mt-2">
                                    <User size={11} color={COLORS.slate[400]} />
                                    <Text className="text-xs text-slate-400 ml-1">
                                      Last done by {task.lastCompletionWorkerName}
                                    </Text>
                                  </View>
                                )}

                                {/* Assigned worker */}
                                {task.assignedWorkerName && !task.isCompleted && (
                                  <View className="flex-row items-center mt-1">
                                    <User size={11} color={COLORS.primary[400]} />
                                    <Text className="text-xs text-primary-500 ml-1">
                                      Assigned to {task.assignedWorkerName}
                                    </Text>
                                  </View>
                                )}
                              </View>

                              {/* Expand/Collapse */}
                              <View className="ml-2">
                                {isExpanded ? (
                                  <ChevronUp size={20} color={COLORS.slate[400]} />
                                ) : (
                                  <ChevronDown size={20} color={COLORS.slate[400]} />
                                )}
                              </View>
                            </View>

                            {/* Expanded Actions */}
                            {isExpanded && (
                              <View className="mt-4 pt-3 border-t border-slate-100">
                                <View className="flex-row gap-2">
                                  {!task.isCompleted && (
                                    <TouchableOpacity
                                      onPress={() => handleOpenCompleteModal(task)}
                                      className="flex-1 py-2.5 rounded-lg flex-row items-center justify-center"
                                      style={{ backgroundColor: statusConfig.bgColor }}
                                      activeOpacity={0.7}
                                    >
                                      <CheckCircle2 size={16} color={statusConfig.color} />
                                      <Text className="text-sm font-semibold ml-1.5" style={{ color: statusConfig.color }}>
                                        Complete
                                      </Text>
                                    </TouchableOpacity>
                                  )}

                                  <TouchableOpacity
                                    onPress={() => handleViewHistory(task)}
                                    className="flex-1 py-2.5 rounded-lg flex-row items-center justify-center bg-slate-100"
                                    activeOpacity={0.7}
                                  >
                                    <History size={16} color={COLORS.slate[600]} />
                                    <Text className="text-sm font-semibold ml-1.5 text-slate-600">History</Text>
                                  </TouchableOpacity>
                                </View>

                                <View className="flex-row gap-2 mt-2">
                                  <TouchableOpacity
                                    onPress={() => handleEditTask(task)}
                                    className="flex-1 py-2.5 rounded-lg flex-row items-center justify-center bg-slate-100"
                                    activeOpacity={0.7}
                                  >
                                    <Edit3 size={16} color={COLORS.slate[600]} />
                                    <Text className="text-sm font-semibold ml-1.5 text-slate-600">Edit</Text>
                                  </TouchableOpacity>

                                  <TouchableOpacity
                                    onPress={() => handleDeleteTask(task)}
                                    className="flex-1 py-2.5 rounded-lg flex-row items-center justify-center bg-red-50"
                                    activeOpacity={0.7}
                                  >
                                    <Trash2 size={16} color={COLORS.error} />
                                    <Text className="text-sm font-semibold ml-1.5 text-red-600">Delete</Text>
                                  </TouchableOpacity>
                                </View>
                              </View>
                            )}
                          </TouchableOpacity>
                        </Card>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Add/Edit Task Modal */}
      <Modal
        visible={showTaskModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowTaskModal(false);
          resetTaskForm();
        }}
      >
        <View className="flex-1 bg-white">
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-slate-100">
            <TouchableOpacity
              onPress={() => {
                setShowTaskModal(false);
                resetTaskForm();
              }}
              className="p-2"
            >
              <X size={22} color={COLORS.slate[600]} />
            </TouchableOpacity>
            <Text className="text-lg font-bold text-slate-900">{isEditing ? 'Edit Task' : 'Add Task'}</Text>
            <Button title="Save" variant="primary" size="sm" onPress={handleSaveTask} />
          </View>

          <ScrollView className="flex-1 px-5 py-4" showsVerticalScrollIndicator={false}>
            {/* Task Name */}
            <View className="mb-5">
              <Text className="text-sm font-semibold text-slate-700 mb-2">Task Name *</Text>
              <Input placeholder="Enter task name" value={taskTitle} onChangeText={setTaskTitle} />
            </View>

            {/* Due Date */}
            <View className="mb-5">
              <Text className="text-sm font-semibold text-slate-700 mb-2">Due Date *</Text>
              <TouchableOpacity
                onPress={() => {
                  setTempTaskDueDate(taskDueDate);
                  setShowDatePicker(true);
                }}
                activeOpacity={0.7}
                className="bg-white rounded-xl px-4 py-3.5 border border-slate-200 flex-row items-center"
              >
                <Calendar size={18} color={COLORS.primary[500]} />
                <Text className="text-base text-slate-700 ml-3 flex-1">
                  {formatDate(taskDueDate.toISOString(), 'EEEE, MMMM d, yyyy')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Assigned Worker */}
            <View className="mb-5">
              <Text className="text-sm font-semibold text-slate-700 mb-2">Assign to Worker</Text>
              <TouchableOpacity
                onPress={() => setShowWorkerPicker(true)}
                activeOpacity={0.7}
                className="bg-white rounded-xl px-4 py-3.5 border border-slate-200 flex-row items-center"
              >
                <User size={18} color={COLORS.slate[400]} />
                <Text className={`text-base ml-3 flex-1 ${taskAssignedWorkerId ? 'text-slate-700' : 'text-slate-400'}`}>
                  {getWorkerName(taskAssignedWorkerId) || 'Select worker (optional)'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Frequency */}
            <View className="mb-5">
              <Text className="text-sm font-semibold text-slate-700 mb-2">Repeat</Text>
              <View className="gap-2">
                {frequencyOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => setTaskFrequency(option.value)}
                    activeOpacity={0.7}
                    className={`flex-row items-center px-4 py-3 rounded-xl border-2 ${
                      taskFrequency === option.value ? 'border-primary-500 bg-primary-50' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <View className="flex-1">
                      <Text className={`text-base font-medium ${taskFrequency === option.value ? 'text-primary-700' : 'text-slate-700'}`}>
                        {option.label}
                      </Text>
                      <Text className="text-xs text-slate-500 mt-0.5">{option.description}</Text>
                    </View>
                    {taskFrequency === option.value && <CheckCircle2 size={20} color={COLORS.primary[500]} />}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Reminder */}
            <View className="mb-5">
              <View className="flex-row items-center mb-2">
                <Bell size={16} color={COLORS.slate[500]} />
                <Text className="text-sm font-semibold text-slate-700 ml-1.5">Remind me</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2">
                  {reminderOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      onPress={() => setTaskReminderDays(option.value)}
                      activeOpacity={0.7}
                      className={`px-4 py-2.5 rounded-xl border-2 ${
                        taskReminderDays === option.value ? 'border-primary-500 bg-primary-50' : 'border-slate-200 bg-white'
                      }`}
                    >
                      <Text className={`text-sm font-medium ${taskReminderDays === option.value ? 'text-primary-700' : 'text-slate-700'}`}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {taskFrequency !== 'once' && (
              <View className="bg-blue-50 rounded-xl p-4 mb-5">
                <Text className="text-sm text-blue-700">
                  This task will automatically reschedule after you mark it complete.
                </Text>
              </View>
            )}
          </ScrollView>
        </View>

        {/* Date Picker Modal */}
        <Modal visible={showDatePicker} transparent animationType="slide">
          <View className="flex-1 justify-end bg-black/50">
            <View className="bg-white rounded-t-3xl">
              <View className="flex-row items-center justify-between px-4 py-3 border-b border-slate-200">
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text className="text-base text-slate-600">Cancel</Text>
                </TouchableOpacity>
                <Text className="text-base font-semibold text-slate-900">Due Date</Text>
                <TouchableOpacity
                  onPress={() => {
                    setTaskDueDate(tempTaskDueDate);
                    setShowDatePicker(false);
                  }}
                >
                  <Text className="text-base font-semibold text-primary-600">Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempTaskDueDate}
                mode="date"
                display="spinner"
                onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
                  if (selectedDate) setTempTaskDueDate(selectedDate);
                }}
                style={{ height: 200 }}
              />
            </View>
          </View>
        </Modal>
      </Modal>

      {/* Worker Picker Modal */}
      <Modal
        visible={showWorkerPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowWorkerPicker(false)}
      >
        <View className="flex-1 bg-white">
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-slate-100">
            <TouchableOpacity onPress={() => setShowWorkerPicker(false)} className="p-2">
              <X size={22} color={COLORS.slate[600]} />
            </TouchableOpacity>
            <Text className="text-lg font-bold text-slate-900">Select Worker</Text>
            <View className="w-10" />
          </View>

          <ScrollView className="flex-1 px-5 py-4">
            <TouchableOpacity
              onPress={() => {
                setTaskAssignedWorkerId(undefined);
                setShowWorkerPicker(false);
              }}
              className={`flex-row items-center px-4 py-3 rounded-xl border-2 mb-2 ${
                !taskAssignedWorkerId ? 'border-primary-500 bg-primary-50' : 'border-slate-200 bg-white'
              }`}
              activeOpacity={0.7}
            >
              <Text className={`text-base font-medium ${!taskAssignedWorkerId ? 'text-primary-700' : 'text-slate-700'}`}>
                No worker assigned
              </Text>
            </TouchableOpacity>

            {workers.map((worker) => (
              <TouchableOpacity
                key={worker.id}
                onPress={() => {
                  setTaskAssignedWorkerId(worker.id);
                  setShowWorkerPicker(false);
                }}
                className={`flex-row items-center px-4 py-3 rounded-xl border-2 mb-2 ${
                  taskAssignedWorkerId === worker.id ? 'border-primary-500 bg-primary-50' : 'border-slate-200 bg-white'
                }`}
                activeOpacity={0.7}
              >
                <User size={20} color={taskAssignedWorkerId === worker.id ? COLORS.primary[500] : COLORS.slate[400]} />
                <View className="flex-1 ml-3">
                  <Text className={`text-base font-medium ${taskAssignedWorkerId === worker.id ? 'text-primary-700' : 'text-slate-700'}`}>
                    {worker.name}
                  </Text>
                  {worker.specialty.length > 0 && (
                    <Text className="text-xs text-slate-500">{worker.specialty.join(', ')}</Text>
                  )}
                </View>
                {taskAssignedWorkerId === worker.id && <CheckCircle2 size={20} color={COLORS.primary[500]} />}
              </TouchableOpacity>
            ))}

            {workers.length === 0 && (
              <View className="items-center py-8">
                <Text className="text-slate-500">No workers added yet</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Complete Task Modal */}
      <Modal
        visible={showCompleteModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCompleteModal(false)}
      >
        <View className="flex-1 bg-white">
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-slate-100">
            <TouchableOpacity onPress={() => setShowCompleteModal(false)} className="p-2">
              <X size={22} color={COLORS.slate[600]} />
            </TouchableOpacity>
            <Text className="text-lg font-bold text-slate-900">Complete Task</Text>
            <Button title="Done" variant="primary" size="sm" onPress={handleCompleteTask} />
          </View>

          <ScrollView className="flex-1 px-5 py-4">
            {completingTask && (
              <View className="bg-slate-50 rounded-xl p-4 mb-5">
                <Text className="text-lg font-semibold text-slate-900">{completingTask.title}</Text>
                <Text className="text-sm text-slate-500 mt-1">{formatDate(getCurrentISODate(), 'MMMM d, yyyy')}</Text>
              </View>
            )}

            {/* Worker Selection */}
            <View className="mb-5">
              <View className="flex-row items-center mb-2">
                <User size={16} color={COLORS.slate[500]} />
                <Text className="text-sm font-semibold text-slate-700 ml-1.5">Who did the work?</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={() => setCompletionWorkerId(undefined)}
                    className={`px-4 py-2.5 rounded-xl border-2 ${
                      !completionWorkerId ? 'border-primary-500 bg-primary-50' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <Text className={`text-sm font-medium ${!completionWorkerId ? 'text-primary-700' : 'text-slate-700'}`}>
                      Myself
                    </Text>
                  </TouchableOpacity>
                  {workers.map((worker) => (
                    <TouchableOpacity
                      key={worker.id}
                      onPress={() => setCompletionWorkerId(worker.id)}
                      className={`px-4 py-2.5 rounded-xl border-2 ${
                        completionWorkerId === worker.id ? 'border-primary-500 bg-primary-50' : 'border-slate-200 bg-white'
                      }`}
                    >
                      <Text className={`text-sm font-medium ${completionWorkerId === worker.id ? 'text-primary-700' : 'text-slate-700'}`}>
                        {worker.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Cost */}
            <View className="mb-5">
              <View className="flex-row items-center mb-2">
                <DollarSign size={16} color={COLORS.slate[500]} />
                <Text className="text-sm font-semibold text-slate-700 ml-1.5">Cost (optional)</Text>
              </View>
              <Input
                placeholder="0.00"
                value={completionCost}
                onChangeText={setCompletionCost}
                keyboardType="decimal-pad"
              />
            </View>

            {/* Notes */}
            <View className="mb-5">
              <View className="flex-row items-center mb-2">
                <FileText size={16} color={COLORS.slate[500]} />
                <Text className="text-sm font-semibold text-slate-700 ml-1.5">Notes (optional)</Text>
              </View>
              <Input
                placeholder="Any observations or notes..."
                value={completionNotes}
                onChangeText={setCompletionNotes}
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* History Modal */}
      <Modal
        visible={showHistoryModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowHistoryModal(false)}
      >
        <View className="flex-1 bg-white">
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-slate-100">
            <TouchableOpacity onPress={() => setShowHistoryModal(false)} className="p-2">
              <X size={22} color={COLORS.slate[600]} />
            </TouchableOpacity>
            <Text className="text-lg font-bold text-slate-900">Completion History</Text>
            <View className="w-10" />
          </View>

          <ScrollView className="flex-1 px-5 py-4">
            {historyTask && (
              <View className="bg-slate-50 rounded-xl p-4 mb-5">
                <Text className="text-lg font-semibold text-slate-900">{historyTask.title}</Text>
                <Text className="text-sm text-slate-500 mt-1">{FREQUENCY_LABELS[historyTask.frequency]}</Text>
              </View>
            )}

            {taskCompletions.length === 0 ? (
              <View className="items-center py-12">
                <History size={48} color={COLORS.slate[300]} />
                <Text className="text-slate-500 mt-4">No completion history yet</Text>
              </View>
            ) : (
              <View className="gap-3">
                {taskCompletions.map((completion, index) => (
                  <Card key={completion.id} variant="default" padding="md">
                    <View className="flex-row items-start">
                      <View className="w-8 h-8 rounded-full bg-green-100 items-center justify-center">
                        <CheckCircle2 size={16} color={COLORS.success} />
                      </View>
                      <View className="flex-1 ml-3">
                        <Text className="text-sm font-semibold text-slate-900">
                          {formatDate(completion.completedDate, 'MMMM d, yyyy')}
                        </Text>
                        {completion.workerName ? (
                          <Text className="text-xs text-slate-500 mt-0.5">Done by {completion.workerName}</Text>
                        ) : (
                          <Text className="text-xs text-slate-500 mt-0.5">Done by myself</Text>
                        )}
                        {completion.cost && (
                          <Text className="text-xs text-slate-600 mt-1">Cost: ${completion.cost.toFixed(2)}</Text>
                        )}
                        {completion.notes && (
                          <Text className="text-sm text-slate-600 mt-2 bg-slate-50 p-2 rounded-lg">{completion.notes}</Text>
                        )}
                      </View>
                    </View>
                  </Card>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
